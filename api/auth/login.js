// POST /api/auth/login — member email + password login.
const { repo, getReadyDb, parseBody, auth } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = parseBody(req);
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = await getReadyDb();
    const member = await repo.findByEmailWithPassword(db, email);
    if (!member || !auth.verifyPassword(String(password), member.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const token = auth.memberToken(member.id, member.token_version);
    return res.status(200).json({ token, member: repo.sanitizeMember(member) });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
