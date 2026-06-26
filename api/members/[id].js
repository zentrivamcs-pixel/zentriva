// /api/members/:id  — PUT (update), DELETE (remove)
const { COLUMNS, getClient, ensureSchema, deserialize, toArgs, parseBody } = require('../_lib');

module.exports = async (req, res) => {
  try {
    const db = getClient();
    await ensureSchema(db);

    const { id } = req.query;

    if (req.method === 'PUT') {
      const existing = await db.execute({
        sql: 'SELECT id FROM members WHERE id = ?',
        args: [id]
      });
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });

      const body = parseBody(req);
      const assignments = COLUMNS.map((col) => `${col} = ?`).join(', ');
      await db.execute({
        sql: `UPDATE members SET ${assignments} WHERE id = ?`,
        args: [...toArgs(body), id]
      });
      const updated = await db.execute({
        sql: 'SELECT * FROM members WHERE id = ?',
        args: [id]
      });
      return res.status(200).json(deserialize(updated.rows[0]));
    }

    if (req.method === 'DELETE') {
      const result = await db.execute({
        sql: 'DELETE FROM members WHERE id = ?',
        args: [id]
      });
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('PUT/DELETE /api/members/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
