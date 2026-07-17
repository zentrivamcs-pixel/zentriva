// POST /api/auth/claim — a registered member sets their password for the
// first time. Identity is proven with the email + Paystack payment reference
// from their registration (shown on their Paystack receipt), so no email
// service is needed.
const { getClient, ensureSchema, parseBody, sanitizeMember, auth } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getClient();
    await ensureSchema(db);

    const { email, payment_reference, password } = parseBody(req);
    if (!email || !payment_reference || !password) {
      return res.status(400).json({ error: 'Email, payment reference, and password are required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await db.execute({
      sql: 'SELECT * FROM members WHERE lower(email) = lower(?) AND payment_reference = ?',
      args: [String(email).trim(), String(payment_reference).trim()]
    });
    const member = result.rows[0];
    if (!member) {
      return res.status(404).json({ error: 'No registration matches that email and payment reference' });
    }
    if (member.password_hash) {
      return res.status(409).json({ error: 'This account is already claimed — use Login instead' });
    }

    await db.execute({
      sql: 'UPDATE members SET password_hash = ? WHERE id = ?',
      args: [auth.hashPassword(String(password)), member.id]
    });

    const token = auth.signToken({ role: 'member', sub: Number(member.id) }, auth.MEMBER_TOKEN_TTL);
    return res.status(200).json({ token, member: sanitizeMember(member) });
  } catch (err) {
    console.error('POST /api/auth/claim error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
