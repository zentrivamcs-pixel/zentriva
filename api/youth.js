// /api/youth — CTCA Youth & Children Program registration (the page at
// ctca.zentrivacoop.com/register, from youth-register/). That site proxies
// /api/youth here, so calls are same-origin and need no CORS.
//
//   POST { action: 'lookup', name, age }                 → { registrant | null }
//   A name belongs to one registrant: lookup/spin/coordinator answer 409
//   (code NAME_TAKEN) when it is already registered under a different age.
//   POST { action: 'spin', name, age, gender }           → { registrant }  (public)
//   POST { action: 'coordinator', name, age, gender, code } → { registrant }
//   POST { action: 'groups', pin }                       → { registrants: [...] }
//   GET  (admin bearer token)                            → { registrants: [...] }
//
// Secrets (Vercel env, main project): YOUTH_ORGANISER_PIN, YOUTH_COORD_CODE.
//
// One function for every action on purpose: a Vercel Hobby deployment is
// capped at 12 serverless functions, and this is the 12th.
// The Express dev server mounts this same handler (server/index.js).
const { getReadyDb, parseBody, sendServerError, auth } = require('./_lib');
const youth = require('../shared/youthRepo');

const LOCKED = 'Too many wrong attempts. Please wait 10 minutes and try again.';

// Checks a submitted secret against an env var, with a shared lockout.
// Responds and returns false on failure.
async function checkSecret(db, res, kind, submitted, envName, wrongMessage, normalise) {
  const expected = process.env[envName];
  if (!expected) {
    console.error(`/api/youth: ${envName} is not set — set it in the Vercel project and redeploy.`);
    res.status(503).json({ error: 'This part of registration is not set up yet. Please ask an organiser.' });
    return false;
  }
  if (await youth.isLockedOut(db, kind)) {
    res.status(429).json({ error: LOCKED });
    return false;
  }
  const norm = normalise || ((s) => s);
  // Only a short string (or a number, for a PIN sent unquoted) can be a secret.
  const text = typeof submitted === 'string' || typeof submitted === 'number' ? String(submitted).trim() : '';
  if (!text || text.length > 64 || !auth.safeEqual(norm(text), norm(expected.trim()))) {
    await youth.recordFailure(db, kind);
    res.status(403).json({ error: wrongMessage });
    return false;
  }
  return true;
}

module.exports = async (req, res) => {
  try {
    const db = await getReadyDb();
    await youth.ensureSchema(db);

    if (req.method === 'GET') {
      if (!auth.isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
      return res.status(200).json({ registrants: await youth.listRegistrants(db) });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = parseBody(req);

    if (body.action === 'groups') {
      if (!await checkSecret(db, res, 'pin', body.pin, 'YOUTH_ORGANISER_PIN', 'That PIN is not correct.')) return;
      return res.status(200).json({ registrants: await youth.listRegistrants(db) });
    }

    if (body.action === 'lookup') {
      const { value, error } = youth.cleanPerson({ ...body, gender: 'Male' });
      if (error) return res.status(400).json({ error });
      return res.status(200).json({ registrant: await youth.lookup(db, value) });
    }

    if (body.action === 'spin' || body.action === 'coordinator') {
      const { value, error } = youth.cleanPerson(body);
      if (error) return res.status(400).json({ error });
      if (body.action === 'coordinator') {
        if (!await checkSecret(db, res, 'coord', body.code, 'YOUTH_COORD_CODE',
          'That coordinator code is not correct.', (s) => s.toUpperCase())) return;
      }
      const registrant = await youth.register(db, value, body.action === 'coordinator' ? 'CO' : null);
      return res.status(registrant.existing ? 200 : 201).json({ registrant });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    if (err instanceof youth.NameTakenError) {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    return sendServerError(res, err, `${req.method} /api/youth`);
  }
};
