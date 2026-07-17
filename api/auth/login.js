// POST /api/auth/login — member email + password login.
const { getClient, ensureSchema, parseBody, sanitizeMember, auth } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getClient();
    await ensureSchema(db);

    const { email, password } = parseBody(req);
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.execute({
      sql: 'SELECT * FROM members WHERE lower(email) = lower(?) AND password_hash IS NOT NULL',
      args: [String(email).trim()]
    });
    const member = result.rows[0];
    if (!member || !auth.verifyPassword(String(password), member.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const token = auth.signToken({ role: 'member', sub: Number(member.id) }, auth.MEMBER_TOKEN_TTL);
    return res.status(200).json({ token, member: sanitizeMember(member) });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
