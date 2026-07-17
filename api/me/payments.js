// GET /api/me/payments — the logged-in member's payment history.
const { getClient, ensureSchema, requireMember, deserialize } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const memberId = requireMember(req, res);
    if (!memberId) return;

    const db = getClient();
    await ensureSchema(db);

    const result = await db.execute({
      sql: `SELECT id, reference, amount_kobo, currency, status, channel, description, paid_at, created_at
            FROM payments WHERE member_id = ?
            ORDER BY datetime(COALESCE(paid_at, created_at)) DESC`,
      args: [memberId]
    });
    return res.status(200).json(result.rows.map(deserialize));
  } catch (err) {
    console.error('GET /api/me/payments error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
