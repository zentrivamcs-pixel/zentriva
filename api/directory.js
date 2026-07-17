// GET /api/directory — the member-facing business directory. Requires a
// member login; returns only consented members and only directory-safe
// fields (the registration consent covers sharing these for networking).
const { getClient, ensureSchema, requireMember, toDirectoryEntry } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!requireMember(req, res)) return;

    const db = getClient();
    await ensureSchema(db);

    const result = await db.execute(
      'SELECT * FROM members WHERE consent = 1 ORDER BY full_name COLLATE NOCASE ASC'
    );
    return res.status(200).json(result.rows.map(toDirectoryEntry));
  } catch (err) {
    console.error('GET /api/directory error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
