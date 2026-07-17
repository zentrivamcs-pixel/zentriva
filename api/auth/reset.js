// POST /api/auth/reset — set a new password with a single-use reset token
// from the email link. Consuming the token and bumping token_version logs
// out every existing session for the member.
const { repo, getReadyDb, parseBody, auth } = require('../_lib');
const { passwordError } = require('../../shared/validation');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, new_password } = parseBody(req);
    if (!token) return res.status(400).json({ error: 'Reset token is required' });
    const pwErr = passwordError(new_password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const db = await getReadyDb();
    const memberId = await repo.consumePasswordReset(db, auth.sha256(String(token).trim()));
    if (!memberId) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired — request a new one.' });
    }

    await repo.setPassword(db, memberId, auth.hashPassword(String(new_password)));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/reset error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
