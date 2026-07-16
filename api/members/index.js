// /api/members  — GET (list all), POST (create)
const {
  COLUMNS, getClient, ensureSchema, deserialize, toArgs, parseBody, verifyPaystackPayment
} = require('../_lib');

module.exports = async (req, res) => {
  try {
    const db = getClient();
    await ensureSchema(db);

    if (req.method === 'GET') {
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

      const paid = await verifyPaystackPayment(body.payment_reference, body.membership_tier);
      if (!paid) {
        return res.status(402).json({ error: 'Payment could not be verified' });
      }

      const placeholders = COLUMNS.map(() => '?').join(', ');
      const result = await db.execute({
        sql: `INSERT INTO members (${COLUMNS.join(', ')}) VALUES (${placeholders})`,
        args: toArgs(body)
      });
      const newId = Number(result.lastInsertRowid);
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
