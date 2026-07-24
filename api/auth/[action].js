// POST /api/auth/:action — member auth flows (check-email, login, claim,
// forgot, reset, verify-email, resend-verification) plus admin-login.
// Consolidated into one dynamic route so these actions share a single
// Vercel serverless function instead of eight (Hobby plan caps a
// deployment at 12 functions).
const { repo, getReadyDb, parseBody, auth } = require('../_lib');
const { isEmailEnabled, sendPasswordResetEmail, sendVerificationEmail } = require('../../shared/email');
const { cleanEmail, passwordError } = require('../../shared/validation');

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// POST /api/auth/check-email — pre-payment duplicate check for the
// registration form, so a member isn't charged before finding out their
// email is already registered.
async function checkEmail(req, res, db) {
  const { email } = parseBody(req);
  if (!email) return res.status(400).json({ error: 'Email is required' });
  return res.status(200).json({ registered: await repo.emailExists(db, email) });
}

// POST /api/auth/login — member email + password login.
async function login(req, res, db) {
  const { email, password } = parseBody(req);
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
  return res.status(200).json({ token, member: repo.sanitizeMember(member) });
}

// POST /api/auth/claim — a registered member sets their password for the
// first time. Identity is proven with the email + Paystack payment reference
// from their registration (shown on their Paystack receipt), so no email
// service is needed.
async function claim(req, res, db) {
  const { email, payment_reference, password } = parseBody(req);
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
  return res.status(200).json({ token, member: repo.sanitizeMember(member) });
}

// POST /api/auth/forgot — request a password-reset email. Always responds
// identically whether or not the email is registered (no account
// enumeration); returns 503 only when email sending isn't configured at all.
async function forgot(req, res, db) {
  if (!isEmailEnabled()) {
    return res.status(503).json({
      error: 'Password reset by email is not available yet — please contact support.',
    });
  }

  const email = cleanEmail(parseBody(req).email);
  if (!email) return res.status(400).json({ error: 'A valid email address is required' });

  // Look up quietly; the response below is the same either way.
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
    // Fire-and-forget; sendPasswordResetEmail never throws.
    await sendPasswordResetEmail(member, token);
  }

  return res.status(200).json({
    ok: true,
    message: 'If that email is registered, a reset link has been sent.',
  });
}

// POST /api/auth/reset — set a new password with a single-use reset token
// from the email link. Consuming the token and bumping token_version logs
// out every existing session for the member.
async function reset(req, res, db) {
  const { token, new_password } = parseBody(req);
  if (!token) return res.status(400).json({ error: 'Reset token is required' });
  const pwErr = passwordError(new_password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const memberId = await repo.consumePasswordReset(db, auth.sha256(String(token).trim()));
  if (!memberId) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired — request a new one.' });
  }

  await repo.setPassword(db, memberId, auth.hashPassword(String(new_password)));
  return res.status(200).json({ ok: true });
}

// POST /api/auth/verify-email — consumes the single-use token from the
// verification email link and marks the member's email as owned.
async function verifyEmail(req, res, db) {
  const { token } = parseBody(req);
  if (!token) return res.status(400).json({ error: 'Verification token is required' });

  const memberId = await repo.consumeEmailVerification(db, auth.sha256(String(token).trim()));
  if (!memberId) {
    return res.status(400).json({ error: 'This verification link is invalid or has expired — request a new one.' });
  }
  await repo.markEmailVerified(db, memberId);
  return res.status(200).json({ ok: true });
}

// POST /api/auth/resend-verification — same response whether or not the
// email is registered/already verified (no account enumeration).
async function resendVerification(req, res, db) {
  if (!isEmailEnabled()) {
    return res.status(503).json({
      error: 'Email verification is not available right now — please contact support.',
    });
  }

  const email = cleanEmail(parseBody(req).email);
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

  return res.status(200).json({
    ok: true,
    message: 'If that email is registered and not yet verified, a verification link has been sent.',
  });
}

// POST /api/auth/admin-login — exchanges the admin password for a signed
// session token. The password lives only in the server env
// (ADMIN_PASSWORD), never in the client bundle. Doesn't touch the member
// database, unlike every other action here.
async function adminLogin(req, res) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server' });
  }
  const { password } = parseBody(req);
  if (!password || !auth.safeEqual(password, adminPassword)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = auth.signToken({ role: 'admin', sub: 'admin' }, auth.ADMIN_TOKEN_TTL);
  return res.status(200).json({ token });
}

const ACTIONS = {
  'check-email': checkEmail,
  login,
  claim,
  forgot,
  reset,
  'verify-email': verifyEmail,
  'resend-verification': resendVerification,
  'admin-login': adminLogin,
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const handler = ACTIONS[req.query.action];
  if (!handler) return res.status(404).json({ error: 'Not found' });

  try {
    const db = await getReadyDb();
    return await handler(req, res, db);
  } catch (err) {
    console.error(`POST /api/auth/${req.query.action} error:`, err);
    return res.status(500).json({ error: 'Server error' });
  }
};
