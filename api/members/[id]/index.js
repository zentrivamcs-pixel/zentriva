// /api/members/:id  — PUT (update), DELETE (remove). Admin only.
const { repo, getReadyDb, parseBody, requireAdmin } = require('../../_lib');
const { cleanAdminWrite } = require('../../../shared/validation');

module.exports = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const db = await getReadyDb();
    const { id } = req.query;

    if (req.method === 'PUT') {
      // Same cleaning rules as registration (lengths, enums, types), but
      // nothing is required — admins may blank out fields.
      const body = parseBody(req);
      const cleaned = cleanAdminWrite(body);
      // Never let a malformed email silently null out a member's login
      // credential — reject instead.
      if (body.email && !cleaned.email) {
        return res.status(400).json({ error: 'Email address is not valid' });
      }
      const updated = await repo.updateMember(db, id, cleaned);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(repo.sanitizeMember(updated));
    }

    if (req.method === 'DELETE') {
      const removed = await repo.deleteMember(db, id);
      if (!removed) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('PUT/DELETE /api/members/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
