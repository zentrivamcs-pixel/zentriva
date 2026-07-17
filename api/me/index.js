// /api/me — GET (the logged-in member's own record), PUT (update own profile).
const { repo, getReadyDb, parseBody, requireMemberRecord } = require('../_lib');
const { cleanProfileUpdate } = require('../../shared/validation');

module.exports = async (req, res) => {
  try {
    const db = await getReadyDb();
    const member = await requireMemberRecord(req, res, db);
    if (!member) return;

    if (req.method === 'GET') {
      return res.status(200).json(repo.sanitizeMember(member));
    }

    if (req.method === 'PUT') {
      // Cleaned (trimmed, length-capped) before the repo's field whitelist.
      const { value: cleaned, errors } = cleanProfileUpdate(parseBody(req), repo.PROFILE_EDITABLE_FIELDS);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
      }
      const { updated, member: fresh } = await repo.updateProfile(db, member.id, cleaned);
      if (!updated) {
        return res.status(400).json({ error: 'No editable fields provided' });
      }
      return res.status(200).json(repo.sanitizeMember(fresh));
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('GET/PUT /api/me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
