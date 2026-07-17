// POST /api/auth/:action — member auth flows (check-email, login, claim,
// forgot, reset). Consolidated into one dynamic route so the five actions
// share a single Vercel serverless function instead of five (Hobby plan
// caps a deployment at 12 functions).
const { repo, getReadyDb, parseBody, auth } = require('../_lib');
const { isEmailEnabled, sendPasswordResetEmail } = require('../../shared/email');
const { cleanEmail, passwordError } = require('../../shared/validation');

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

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

const ACTIONS = {
  'check-email': checkEmail,
  login,
  claim,
  forgot,
  reset,
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
