// POST /api/admin/login — exchanges the admin password for a signed session
// token. The password lives only in the server env (ADMIN_PASSWORD), never
// in the client bundle.
const { parseBody, auth } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server' });
  }

  const { password } = parseBody(req);
  if (!password || !auth.safeEqual(password, adminPassword)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const token = auth.signToken({ role: 'admin', sub: 'admin' }, auth.ADMIN_TOKEN_TTL);
  return res.status(200).json({ token });
};
