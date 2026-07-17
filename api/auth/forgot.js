// POST /api/auth/forgot — request a password-reset email. Always responds
// identically whether or not the email is registered (no account
// enumeration); returns 503 only when email sending isn't configured at all.
const { repo, getReadyDb, parseBody, auth } = require('../_lib');
const { isEmailEnabled, sendPasswordResetEmail } = require('../../shared/email');
const { cleanEmail } = require('../../shared/validation');

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!isEmailEnabled()) {
      return res.status(503).json({
        error: 'Password reset by email is not available yet — please contact support.',
      });
    }

    const email = cleanEmail(parseBody(req).email);
    if (!email) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    const db = await getReadyDb();
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
  } catch (err) {
    console.error('POST /api/auth/forgot error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
