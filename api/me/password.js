// POST /api/me/password — change the logged-in member's password. Bumps the
// member's token_version (logging out every other session) and returns a
// fresh token so the current session stays signed in.
const { repo, getReadyDb, parseBody, requireMemberRecord, auth } = require('../_lib');
const { passwordError } = require('../../shared/validation');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getReadyDb();
    const member = await requireMemberRecord(req, res, db);
    if (!member) return;

    const { current_password, new_password } = parseBody(req);
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    const pwErr = passwordError(new_password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    if (!auth.verifyPassword(String(current_password), member.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newVersion = await repo.setPassword(db, member.id, auth.hashPassword(String(new_password)));
    return res.status(200).json({ ok: true, token: auth.memberToken(member.id, newVersion) });
  } catch (err) {
    console.error('POST /api/me/password error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
