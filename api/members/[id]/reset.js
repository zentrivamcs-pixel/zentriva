// POST /api/members/:id/reset — admin stopgap: clears the member's portal
// password (and invalidates their sessions). The member re-activates via the
// claim flow (email + payment reference) or a reset email.
const { repo, getReadyDb, requireAdmin } = require('../../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!requireAdmin(req, res)) return;

    const db = await getReadyDb();
    const member = await repo.clearPassword(db, req.query.id);
    if (!member) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(repo.sanitizeMember(member));
  } catch (err) {
    console.error('POST /api/members/:id/reset error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
