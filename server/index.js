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
const inboxRepo = require('../shared/inboxRepo');
const { getTier } = require('../shared/membershipTiers');
const auth = require('../shared/authUtils');
const { validateRegistration, passwordError, cleanProfileUpdate, cleanAdminWrite, cleanEmail, cleanUrl, cleanString } = require('../shared/validation');
const { isEmailEnabled, sendRegistrationEmail, sendPasswordResetEmail, sendPaymentApprovedEmail, sendPaymentRejectedEmail, sendVerificationEmail, getReceivedEmail } = require('../shared/email');
const { verifySvixSignature } = require('../shared/webhookAuth');
const { handleUpload } = require('@vercel/blob/client');

const RESET_TTL_MS = 30 * 60 * 1000; // password-reset links live 30 minutes
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // email-verification links live 24 hours

const app = express();
const PORT = process.env.PORT || 5000;

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const db = getDb();
const ready = Promise.all([repo.ensureSchema(db), inboxRepo.ensureSchema(db)]);

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
  if (member.payment_status === 'pending_review') {
    return res.status(403).json({ error: 'Your bank transfer payment is still under review. You\'ll be able to log in once an admin approves it.' });
  }
  if (member.payment_status === 'rejected') {
    return res.status(403).json({ error: 'Your payment could not be verified. Please contact support to complete your registration.' });
  }
  if (!member.email_verified) {
    return res.status(403).json({
      error: 'Please verify your email address before logging in. Check your inbox for the verification link, or request a new one.',
      code: 'EMAIL_NOT_VERIFIED',
    });
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

// Consumes the single-use token from the verification email link.
app.post('/api/auth/verify-email', wrap(async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Verification token is required' });

  const memberId = await repo.consumeEmailVerification(db, auth.sha256(String(token).trim()));
  if (!memberId) {
    return res.status(400).json({ error: 'This verification link is invalid or has expired — request a new one.' });
  }
  await repo.markEmailVerified(db, memberId);
  res.json({ ok: true });
}));

// Same response whether or not the email is registered/already verified
// (no account enumeration); 503 only when email isn't configured.
app.post('/api/auth/resend-verification', wrap(async (req, res) => {
  if (!isEmailEnabled()) {
    return res.status(503).json({
      error: 'Email verification is not available right now — please contact support.',
    });
  }
  const email = cleanEmail((req.body || {}).email);
  if (!email) return res.status(400).json({ error: 'A valid email address is required' });

  const found = await db.execute({
    sql: 'SELECT * FROM members WHERE lower(email) = lower(?) LIMIT 1',
    args: [email],
  });
  const member = found.rows[0];
  if (member && !member.email_verified) {
    const token = auth.randomToken();
    await repo.createEmailVerification(
      db, Number(member.id), auth.sha256(token),
      new Date(Date.now() + VERIFY_TTL_MS).toISOString()
    );
    await sendVerificationEmail(member, token);
  }
  res.json({ ok: true, message: 'If that email is registered and not yet verified, a verification link has been sent.' });
}));

// --- Member self-service --------------------------------------------------------

app.get('/api/me', requireMember, wrap(async (req, res) => {
  res.json(repo.sanitizeMember(req.member));
}));

app.put('/api/me', requireMember, wrap(async (req, res) => {
  // Cleaned (trimmed, length-capped) before the repo's field whitelist.
  const { value: cleaned, errors } = cleanProfileUpdate(req.body || {}, repo.PROFILE_EDITABLE_FIELDS);
  if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });
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

// Stored as a row in the same inbound_messages table the Resend inbox
// webhook writes to, so it shows up in the existing Admin Inbox. Mirrors
// api/me/support.js. SUPPORT_TO_ADDRESS mirrors src/shared/contact.js's
// SUPPORT_EMAIL — kept in sync manually, same convention as membershipTiers.js.
app.post('/api/me/support', requireMember, wrap(async (req, res) => {
  const SUPPORT_TO_ADDRESS = 'support@zentrivacoop.com';
  const { subject, message } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  const trimmedSubject = subject && String(subject).trim()
    ? String(subject).trim().slice(0, 200)
    : '(no subject)';
  const trimmedMessage = String(message).trim().slice(0, 5000);

  await inboxRepo.createInboundMessage(db, {
    resendId: `member-${req.memberId}-${Date.now()}`,
    from: req.member.email,
    to: SUPPORT_TO_ADDRESS,
    subject: trimmedSubject,
    text: trimmedMessage,
    receivedAt: new Date().toISOString(),
  });

  res.status(201).json({ ok: true });
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

  // Two ways to pay: a verified Paystack charge (member logs in right away),
  // or a bank transfer with an uploaded proof image (account is created but
  // login is gated until an admin approves the proof from the dashboard).
  const isBankTransfer = body.payment_method === 'bank_transfer';
  let tx;
  let paymentMeta;
  if (isBankTransfer) {
    const proofUrl = cleanUrl(body.payment_proof_url);
    if (!proofUrl) {
      return res.status(400).json({ error: 'A payment proof image is required for bank transfer registrations' });
    }
    tx = {
      reference: value.payment_reference,
      amount: getTier(value.membership_tier).priceNaira * 100,
      currency: 'NGN',
      status: 'pending',
      channel: 'bank_transfer',
      paid_at: null,
    };
    paymentMeta = { method: 'bank_transfer', status: 'pending_review', proofUrl };
  } else {
    tx = await verifyPaystackPayment(value.payment_reference, value.membership_tier);
    if (!tx) {
      return res.status(402).json({ error: 'Payment could not be verified' });
    }
    paymentMeta = { method: 'paystack', status: 'paid', proofUrl: null };
  }

  try {
    // Atomic: member row + membership number + password + payment record.
    const created = await repo.createMember(db, value, tx, passwordHash, paymentMeta);

    // Membership confirmation email — best-effort, never fails a paid
    // registration (sendRegistrationEmail never throws).
    await sendRegistrationEmail(created);

    // Payment proves the charge went through, not that this member owns
    // the email address — that's proven separately via this link before
    // login is allowed (see the email_verified gate on /api/auth/login).
    const verifyToken = auth.randomToken();
    await repo.createEmailVerification(
      db, Number(created.id), auth.sha256(verifyToken),
      new Date(Date.now() + VERIFY_TTL_MS).toISOString()
    );
    await sendVerificationEmail(created, verifyToken);

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

// Approves or rejects a pending bank-transfer registration's payment proof.
// Approving unblocks the member's portal login; rejecting leaves it locked.
app.post('/api/members/:id/payment', requireAdmin, wrap(async (req, res) => {
  const { decision } = req.body || {};
  if (decision !== 'approve' && decision !== 'reject') {
    return res.status(400).json({ error: 'decision must be "approve" or "reject"' });
  }
  const status = decision === 'approve' ? 'paid' : 'rejected';
  const member = await repo.setPaymentStatus(db, req.params.id, status);
  if (!member) return res.status(404).json({ error: 'Not found' });
  if (decision === 'approve') {
    await sendPaymentApprovedEmail(member);
  } else {
    await sendPaymentRejectedEmail(member);
  }
  res.json(repo.sanitizeMember(member));
}));

// --- Inbound email (Resend "Inbound") ---------------------------------------------

// Resend's email.received webhook. Payloads only carry metadata, so this
// fetches the full message via the Received Emails API and stores it —
// idempotent on resend_id, since Svix (and therefore Resend) retries
// deliveries that don't get a fast 200.
app.post('/api/inbox/receive', wrap(async (req, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'RESEND_WEBHOOK_SECRET is not configured' });

  const rawBody = (req.rawBody || Buffer.from('')).toString('utf8');
  const valid = verifySvixSignature({
    id: req.headers['svix-id'],
    timestamp: req.headers['svix-timestamp'],
    signature: req.headers['svix-signature'],
    body: rawBody,
    secret,
  });
  if (!valid) return res.status(401).json({ error: 'Invalid signature' });

  const event = req.body || {};
  if (event.type === 'email.received' && event.data && event.data.email_id) {
    const full = await getReceivedEmail(event.data.email_id);
    await inboxRepo.createInboundMessage(db, {
      resendId: full.id,
      from: full.from,
      to: Array.isArray(full.to) ? full.to.join(', ') : full.to,
      subject: full.subject,
      text: full.text,
      html: full.html,
      attachments: full.attachments,
      receivedAt: full.created_at,
    });
  }
  res.json({ received: true });
}));

app.get('/api/inbox/list', requireAdmin, wrap(async (req, res) => {
  res.json(await inboxRepo.listInboundMessages(db));
}));

app.post('/api/inbox/mark-read', requireAdmin, wrap(async (req, res) => {
  const { id, read } = req.body || {};
  if (id === undefined) return res.status(400).json({ error: 'id is required' });
  await inboxRepo.setInboundMessageRead(db, id, read !== false);
  res.json({ ok: true });
}));

// --- Public contact form ----------------------------------------------------------

// Mirrors api/contact.js. Stored as a row in the same inbound_messages
// table the Resend inbox webhook writes to, so it shows up in the existing
// Admin Inbox. SUPPORT_TO_ADDRESS mirrors src/shared/contact.js's
// SUPPORT_EMAIL — kept in sync manually, same convention as membershipTiers.js.
app.post('/api/contact', wrap(async (req, res) => {
  const SUPPORT_TO_ADDRESS = 'support@zentrivacoop.com';
  const name = cleanString(req.body && req.body.name, 120);
  const email = cleanEmail(req.body && req.body.email);
  const message = cleanString(req.body && req.body.message, 5000);
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }
  const subject = cleanString(req.body && req.body.subject, 200) || `Website contact form — ${name}`;

  await inboxRepo.createInboundMessage(db, {
    resendId: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: `${name} <${email}>`,
    to: SUPPORT_TO_ADDRESS,
    subject,
    text: message,
    receivedAt: new Date().toISOString(),
  });

  res.status(201).json({ ok: true });
}));

// --- File uploads (Vercel Blob) --------------------------------------------------

const UPLOAD_ALLOWED_PREFIXES = ['passports/', 'payment-proofs/'];
const UPLOAD_ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5MB

// Issues short-lived client tokens for direct-to-Blob uploads (passport
// photos, payment proof). The file itself never passes through this server.
app.post('/api/uploads', async (req, res) => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!UPLOAD_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
          throw new Error('Uploads are only allowed under passports/ or payment-proofs/');
        }
        return {
          allowedContentTypes: UPLOAD_ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: UPLOAD_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    res.json(jsonResponse);
  } catch (err) {
    console.error('POST /api/uploads error:', err);
    res.status(400).json({ error: err.message || 'Upload token request failed' });
  }
});

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
