// /api/members/:id  — PUT (update), DELETE (remove). Admin only.
const { repo, getReadyDb, parseBody, requireAdmin, sendServerError } = require('../../_lib');
const { cleanAdminWrite, cleanMembershipId, MEMBERSHIP_ID_ERROR } = require('../../../shared/validation');

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
      // The membership number is editable but never clearable — a blank or
      // malformed one is refused rather than saved, since it's what the
      // member's card and QR code identify them by. Absent means unchanged.
      if (body.membership_id !== undefined && body.membership_id !== null) {
        cleaned.membership_id = cleanMembershipId(body.membership_id);
        if (!cleaned.membership_id) {
          return res.status(400).json({ error: MEMBERSHIP_ID_ERROR });
        }
      }
      try {
        const updated = await repo.updateMember(db, id, cleaned);
        if (!updated) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(repo.sanitizeMember(updated));
      } catch (err) {
        if (err instanceof repo.ConflictError) {
          return res.status(409).json({ error: err.message, code: err.code });
        }
        throw err;
      }
    }

    if (req.method === 'DELETE') {
      const removed = await repo.deleteMember(db, id);
      if (!removed) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return sendServerError(res, err, 'PUT/DELETE /api/members/:id');
  }
};
