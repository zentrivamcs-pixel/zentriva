// /api/members  — GET (list all, admin only), POST (create, payment-gated)
const {
  COLUMNS, getClient, ensureSchema, deserialize, toArgs, parseBody,
  verifyPaystackPayment, buildMembershipId, requireAdmin,
} = require('../_lib');

module.exports = async (req, res) => {
  try {
    const db = getClient();
    await ensureSchema(db);

    if (req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const result = await db.execute(
        'SELECT * FROM members ORDER BY datetime(created_at) DESC'
      );
      return res.status(200).json(result.rows.map(deserialize));
    }

    if (req.method === 'POST') {
      const body = parseBody(req);

      if (!body.payment_reference) {
        return res.status(402).json({ error: 'Payment reference is required' });
      }

      const tx = await verifyPaystackPayment(body.payment_reference, body.membership_tier);
      if (!tx) {
        return res.status(402).json({ error: 'Payment could not be verified' });
      }

      const placeholders = COLUMNS.map(() => '?').join(', ');
      const result = await db.execute({
        sql: `INSERT INTO members (${COLUMNS.join(', ')}) VALUES (${placeholders})`,
        args: toArgs(body)
      });
      const newId = Number(result.lastInsertRowid);

      // Assign the human-readable membership number now that the id exists.
      const membershipId = buildMembershipId(newId, body.membership_category);
      await db.execute({
        sql: 'UPDATE members SET membership_id = ? WHERE id = ?',
        args: [membershipId, newId]
      });

      // Record the verified payment for the member's billing history.
      try {
        await db.execute({
          sql: `INSERT INTO payments (member_id, reference, amount_kobo, currency, status, channel, description, paid_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(reference) DO UPDATE SET member_id = excluded.member_id`,
          args: [
            newId, tx.reference, tx.amount, tx.currency, tx.status,
            tx.channel || null,
            `${body.membership_tier || 'standard'} tier registration`,
            tx.paid_at || tx.paidAt || null,
          ]
        });
      } catch (payErr) {
        // Payment history is best-effort — never fail the registration over it.
        console.error('Failed to record payment history:', payErr);
      }

      const created = await db.execute({
        sql: 'SELECT * FROM members WHERE id = ?',
        args: [newId]
      });
      return res.status(201).json(deserialize(created.rows[0]));
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'This payment has already been used for a registration' });
    }
    console.error('GET/POST /api/members error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
