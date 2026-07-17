// POST /api/auth/check-email — pre-payment duplicate check for the
// registration form, so a member isn't charged before finding out their
// email is already registered.
const { repo, getReadyDb, parseBody } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = parseBody(req);
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const db = await getReadyDb();
    return res.status(200).json({ registered: await repo.emailExists(db, email) });
  } catch (err) {
    console.error('POST /api/auth/check-email error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
