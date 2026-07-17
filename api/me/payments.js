// GET /api/me/payments — the logged-in member's payment history.
const { repo, getReadyDb, requireMemberRecord } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getReadyDb();
    const member = await requireMemberRecord(req, res, db);
    if (!member) return;

    return res.status(200).json(await repo.listPaymentsForMember(db, member.id));
  } catch (err) {
    console.error('GET /api/me/payments error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
