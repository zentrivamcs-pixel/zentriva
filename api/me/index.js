// /api/me — GET (the logged-in member's own record), PUT (update own profile).
const {
  getClient, ensureSchema, parseBody, sanitizeMember, requireMember,
  PROFILE_EDITABLE_FIELDS, buildMembershipId,
} = require('../_lib');

module.exports = async (req, res) => {
  try {
    const memberId = requireMember(req, res);
    if (!memberId) return;

    const db = getClient();
    await ensureSchema(db);

    const load = () => db.execute({ sql: 'SELECT * FROM members WHERE id = ?', args: [memberId] });

    let result = await load();
    if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
    let member = result.rows[0];

    // Backfill membership numbers for members registered before they existed.
    if (!member.membership_id) {
      await db.execute({
        sql: 'UPDATE members SET membership_id = ? WHERE id = ?',
        args: [buildMembershipId(member.id, member.membership_category, member.created_at), memberId]
      });
      result = await load();
      member = result.rows[0];
    }

    if (req.method === 'GET') {
      return res.status(200).json(sanitizeMember(member));
    }

    if (req.method === 'PUT') {
      const body = parseBody(req);
      const updates = PROFILE_EDITABLE_FIELDS.filter((f) => body[f] !== undefined);
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No editable fields provided' });
      }
      const assignments = updates.map((f) => `${f} = ?`).join(', ');
      const args = updates.map((f) => (body[f] === '' ? null : body[f]));
      await db.execute({
        sql: `UPDATE members SET ${assignments} WHERE id = ?`,
        args: [...args, memberId]
      });
      const updated = await load();
      return res.status(200).json(sanitizeMember(updated.rows[0]));
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('GET/PUT /api/me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
