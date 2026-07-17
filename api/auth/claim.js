// POST /api/auth/claim — a registered member sets their password for the
// first time. Identity is proven with the email + Paystack payment reference
// from their registration (shown on their Paystack receipt), so no email
// service is needed.
const { repo, getReadyDb, parseBody, auth } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, payment_reference, password } = parseBody(req);
    if (!email || !payment_reference || !password) {
      return res.status(400).json({ error: 'Email, payment reference, and password are required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = await getReadyDb();
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
  } catch (err) {
    console.error('POST /api/auth/claim error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
