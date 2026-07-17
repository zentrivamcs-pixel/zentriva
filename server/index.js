// Local dev API server. Same routes as the Vercel functions in api/, built
// on the same data layer (shared/membersRepo.js) and the same libSQL client
// (shared/db.js — a local SQLite file when TURSO_DATABASE_URL is unset).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { getDb } = require('../shared/db');
const repo = require('../shared/membersRepo');
const { getTier } = require('../shared/membershipTiers');
const auth = require('../shared/authUtils');
const { validateRegistration, passwordError, cleanProfileUpdate, cleanAdminWrite, cleanEmail } = require('../shared/validation');
const { isEmailEnabled, sendRegistrationEmail, sendPasswordResetEmail } = require('../shared/email');

const RESET_TTL_MS = 30 * 60 * 1000; // password-reset links live 30 minutes

const app = express();
const PORT = process.env.PORT || 5000;

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const db = getDb();
const ready = repo.ensureSchema(db);

// Dev server is only ever called by the CRA dev client.
app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));

// Keep the raw body around for Paystack webhook signature verification.
// The explicit size limit keeps oversized payloads out before parsing.
app.use(express.json({
  limit: '100kb',
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

// Wait for the schema before handling any request, and funnel async route
// errors into one place.
app.use((req, res, next) => { ready.then(() => next(), next); });

const wrap = (handler) => (req, res, next) => handler(req, res).catch(next);

// Confirms a Paystack transaction actually succeeded, for the right amount
// (the price of the given membership tier) and currency. Returns the
// transaction object, or null.
async function verifyPaystackPayment(reference, membershipTierKey) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the server');
  }
  const expectedKobo = getTier(membershipTierKey).priceNaira * 100;
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
  );
  const result = await response.json();
  const tx = result && result.data;
  const ok = !!(
    result && result.status && tx &&
    tx.status === 'success' &&
    tx.amount === expectedKobo &&
    tx.currency === 'NGN'
  );
  return ok ? tx : null;
}

// --- Auth middleware ---------------------------------------------------------

function requireAdmin(req, res, next) {
  if (auth.isAdmin(req)) return next();
  return res.status(401).json({ error: 'Admin authentication required' });
}

// Authenticates a member request AND loads their row, rejecting tokens whose
// version no longer matches (i.e. issued before a password change/reset).
function requireMember(req, res, next) {
  const payload = auth.getMemberPayload(req);
  if (!payload) return res.status(401).json({ error: 'Login required' });
  repo.getMemberWithMembershipId(db, payload.sub).then((member) => {
    if (!member || Number(payload.v || 0) !== Number(member.token_version || 0)) {
      return res.status(401).json({ error: 'Session expired — please log in again' });
    }
    req.member = member;
    req.memberId = member.id;
    return next();
  }, next);
}

// --- Admin auth ---------------------------------------------------------------

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server' });
  }
  const { password } = req.body || {};
  if (!password || !auth.safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = auth.signToken({ role: 'admin', sub: 'admin' }, auth.ADMIN_TOKEN_TTL);
  res.json({ token });
});

// --- Member auth ---------------------------------------------------------------

app.post('/api/auth/claim', wrap(async (req, res) => {
  const { email, payment_reference, password } = req.body || {};
  if (!email || !payment_reference || !password) {
    return res.status(400).json({ error: 'Email, payment reference, and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const member = await repo.findByEmailAndReference(db, email, payment_reference);
  if (!member) {
    return res.status(404).json({ error: 'No registration matches that email and payment reference' });
  }
  if (member.password_hash) {
    return res.status(409).json({ error: 'This account is already claimed — use Login instead' });
  }
  const newVersion = await repo.setPassword(db, member.id, auth.hashPassword(String(password)));
  const token = auth.memberToken(member.id, newVersion);
  res.json({ token, member: repo.sanitizeMember(member) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const member = await repo.findByEmailWithPassword(db, email);
  if (!member || !auth.verifyPassword(String(password), member.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  const token = auth.memberToken(member.id, member.token_version);
  res.json({ token, member: repo.sanitizeMember(member) });
}));

app.post('/api/auth/check-email', wrap(async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });
  res.json({ registered: await repo.emailExists(db, email) });
}));

// Request a password-reset email. Same response whether or not the email is
// registered (no account enumeration); 503 only when email isn't configured.
app.post('/api/auth/forgot', wrap(async (req, res) => {
  if (!isEmailEnabled()) {
    return res.status(503).json({
      error: 'Password reset by email is not available yet — please contact support.',
    });
  }
  const email = cleanEmail((req.body || {}).email);
  if (!email) return res.status(400).json({ error: 'A valid email address is required' });

  const found = await db.execute({
    sql: 'SELECT * FROM members WHERE lower(email) = lower(?) LIMIT 1',
    args: [email],
  });
  const member = found.rows[0];
  if (member) {
    // Store only the hash — the raw token exists only in the email link.
    const token = auth.randomToken();
    await repo.createPasswordReset(
      db, Number(member.id), auth.sha256(token),
      new Date(Date.now() + RESET_TTL_MS).toISOString()
    );
    await sendPasswordResetEmail(member, token);
  }
  res.json({ ok: true, message: 'If that email is registered, a reset link has been sent.' });
}));

// Set a new password with a single-use reset token from the email link.
app.post('/api/auth/reset', wrap(async (req, res) => {
  const { token, new_password } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Reset token is required' });
  const pwErr = passwordError(new_password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const memberId = await repo.consumePasswordReset(db, auth.sha256(String(token).trim()));
  if (!memberId) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired — request a new one.' });
  }
  await repo.setPassword(db, memberId, auth.hashPassword(String(new_password)));
  res.json({ ok: true });
}));

// --- Member self-service --------------------------------------------------------

app.get('/api/me', requireMember, wrap(async (req, res) => {
  res.json(repo.sanitizeMember(req.member));
}));

app.put('/api/me', requireMember, wrap(async (req, res) => {
  // Cleaned (trimmed, length-capped) before the repo's field whitelist.
  const cleaned = cleanProfileUpdate(req.body || {}, repo.PROFILE_EDITABLE_FIELDS);
  const { updated, member } = await repo.updateProfile(db, req.memberId, cleaned);
  if (!updated) return res.status(400).json({ error: 'No editable fields provided' });
  res.json(repo.sanitizeMember(member));
}));

app.post('/api/me/password', requireMember, wrap(async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }
  const pwErr = passwordError(new_password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  if (!auth.verifyPassword(String(current_password), req.member.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  // Bumping token_version logs out every other session; return a fresh
  // token so the current session stays signed in.
  const newVersion = await repo.setPassword(db, req.memberId, auth.hashPassword(String(new_password)));
  res.json({ ok: true, token: auth.memberToken(req.memberId, newVersion) });
}));

app.get('/api/me/payments', requireMember, wrap(async (req, res) => {
  res.json(await repo.listPaymentsForMember(db, req.memberId));
}));

// --- Member directory ------------------------------------------------------------

app.get('/api/directory', requireMember, wrap(async (req, res) => {
  res.json(await repo.listDirectory(db));
}));

// --- Admin member CRUD -------------------------------------------------------------

app.get('/api/members', requireAdmin, wrap(async (req, res) => {
  res.json(await repo.listMembers(db));
}));

// POST /api/members — store one submission (requires a verified Paystack payment).
app.post('/api/members', wrap(async (req, res) => {
  const body = req.body || {};

  // Everything written to the database goes through the validation layer:
  // trimmed, length-capped, enum-checked, unknown fields dropped.
  const { value, errors } = validateRegistration(body);
  if (errors.length > 0) {
    return res.status(400).json({ error: `Invalid registration: ${errors.join('; ')}` });
  }

  // The portal password is set during registration — hashed here, never
  // stored or logged in plaintext. Optional server-side so a paid
  // registration from an outdated client is never rejected after the
  // charge; those members activate later via the claim flow.
  let passwordHash = null;
  if (body.password !== undefined && body.password !== '') {
    const pwErr = passwordError(body.password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    passwordHash = auth.hashPassword(String(body.password));
  }

  const tx = await verifyPaystackPayment(value.payment_reference, value.membership_tier);
  if (!tx) {
    return res.status(402).json({ error: 'Payment could not be verified' });
  }

  try {
    // Atomic: member row + membership number + password + payment record.
    const created = await repo.createMember(db, value, tx, passwordHash);

    // Membership confirmation email — best-effort, never fails a paid
    // registration (sendRegistrationEmail never throws).
    await sendRegistrationEmail(created);

    res.status(201).json(repo.sanitizeMember(created));
  } catch (err) {
    if (err instanceof repo.ConflictError) {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    throw err;
  }
}));

app.put('/api/members/:id', requireAdmin, wrap(async (req, res) => {
  const body = req.body || {};
  const cleaned = cleanAdminWrite(body);
  // Never let a malformed email silently null out a member's login
  // credential — reject instead.
  if (body.email && !cleaned.email) {
    return res.status(400).json({ error: 'Email address is not valid' });
  }
  const updated = await repo.updateMember(db, req.params.id, cleaned);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(repo.sanitizeMember(updated));
}));

app.delete('/api/members/:id', requireAdmin, wrap(async (req, res) => {
  const removed = await repo.deleteMember(db, req.params.id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}));

// Admin stopgap: clears the member's portal password (and their sessions)
// so they can re-activate via the claim flow or a reset email.
app.post('/api/members/:id/reset', requireAdmin, wrap(async (req, res) => {
  const member = await repo.clearPassword(db, req.params.id);
  if (!member) return res.status(404).json({ error: 'Not found' });
  res.json(repo.sanitizeMember(member));
}));

// --- Paystack webhook -----------------------------------------------------------

app.post('/api/paystack/webhook', wrap(async (req, res) => {
  if (!PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not configured' });
  }
  const signature = req.headers['x-paystack-signature'];
  const expected = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(req.rawBody || Buffer.from(''))
    .digest('hex');
  if (!signature || signature !== expected) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body || {};
  if (event.event === 'charge.success' && event.data) {
    await repo.recordWebhookPayment(db, event.data);
  }
  res.json({ received: true });
}));

// Last-resort error handler for anything wrap() caught.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`${req.method} ${req.path} failed:`, err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
