// POST /api/me/password — change the logged-in member's password.
const { getClient, ensureSchema, parseBody, requireMember, auth } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const memberId = requireMember(req, res);
    if (!memberId) return;

    const db = getClient();
    await ensureSchema(db);

    const { current_password, new_password } = parseBody(req);
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const result = await db.execute({
      sql: 'SELECT password_hash FROM members WHERE id = ?',
      args: [memberId]
    });
    const member = result.rows[0];
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!auth.verifyPassword(String(current_password), member.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    await db.execute({
      sql: 'UPDATE members SET password_hash = ? WHERE id = ?',
      args: [auth.hashPassword(String(new_password)), memberId]
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('POST /api/me/password error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
