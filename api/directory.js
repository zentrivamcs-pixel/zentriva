// GET /api/directory — the member-facing business directory. Requires a
// member login; returns only consented members and only directory-safe
// fields (the registration consent covers sharing these for networking).
const { repo, getReadyDb, requireMemberRecord } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getReadyDb();
    if (!(await requireMemberRecord(req, res, db))) return;

    return res.status(200).json(await repo.listDirectory(db));
  } catch (err) {
    console.error('GET /api/directory error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
