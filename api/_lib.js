// Shared helpers for the Vercel serverless API. Files prefixed with "_" are
// not treated as routes by Vercel. All data access lives in
// shared/membersRepo.js (one schema + one set of queries for every runtime);
// this module adds the HTTP-side concerns: auth guards, body parsing, and
// Paystack verification.
const { getDb, isDatabaseUnavailable, isDatabaseAuthRejected } = require('../shared/db');
const repo = require('../shared/membersRepo');
const { getTier } = require('../shared/membershipTiers');
const auth = require('../shared/authUtils');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Confirms a Paystack transaction actually succeeded, for the right amount
// (the price of the given membership tier) and currency. Returns the
// transaction object on success so callers can record the payment, or null.
async function verifyPaystackPayment(reference, membershipTierKey) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the server');
  }
  const expectedKobo = getTier(membershipTierKey).priceNaira * 100;
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
  );
  const result = await response.json();
  const tx = result && result.data;
  const ok = !!(
    result && result.status && tx &&
    tx.status === 'success' &&
    tx.amount === expectedKobo &&
    tx.currency === 'NGN'
  );
  return ok ? tx : null;
}

// Returns a client with the schema guaranteed to exist.
async function getReadyDb() {
  const db = getDb();
  await repo.ensureSchema(db);
  return db;
}

// Vercel parses JSON bodies automatically, but guard against strings/empties.
function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

// Returns the request body as a string, for the webhook routes that verify a
// signature computed over the exact bytes sent (Paystack HMAC, Svix/Resend).
//
// Vercel's Node helpers may already have consumed the request stream before
// the handler runs — `config.api.bodyParser` is a Next.js switch and is not
// guaranteed to disable them here. Reading the stream again in that case
// yields nothing AND never resolves ('end' has already fired, so a listener
// attached now is never called), which is why this checks the platform's own
// buffers first and only falls back to reading the stream while it is
// genuinely still readable. A re-serialized body is a last resort: it usually
// matches byte-for-byte for compact webhook JSON, but not always — which is
// why the raw paths above come first.
function readRawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return Promise.resolve(req.rawBody.toString('utf8'));
  if (typeof req.rawBody === 'string') return Promise.resolve(req.rawBody);

  const alreadyRead = req.readableEnded || req.readable === false || req.body !== undefined;
  if (alreadyRead) {
    if (typeof req.body === 'string') return Promise.resolve(req.body);
    if (req.body && typeof req.body === 'object') return Promise.resolve(JSON.stringify(req.body));
    return Promise.resolve('');
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function requireAdmin(req, res) {
  if (auth.isAdmin(req)) return true;
  res.status(401).json({ error: 'Admin authentication required' });
  return false;
}

// Authenticates a member request AND loads their row, rejecting tokens whose
// version no longer matches (i.e. issued before a password change/reset).
// Responds 401 and returns null when not authenticated.
async function requireMemberRecord(req, res, db) {
  const payload = auth.getMemberPayload(req);
  if (!payload) {
    res.status(401).json({ error: 'Login required' });
    return null;
  }
  const member = await repo.getMemberWithMembershipId(db, payload.sub);
  if (!member || Number(payload.v || 0) !== Number(member.token_version || 0)) {
    res.status(401).json({ error: 'Session expired — please log in again' });
    return null;
  }
  return member;
}

// The single failure response for every route's catch block. A database that
// cannot be reached is a 503, not a 500: it is not the caller's request that
// is wrong, the response is worth retrying, and the message says so instead of
// the bare "Server error" that sent an entire outage investigation into the
// application code. Anything else stays a 500 with a generic message, since
// unexpected exceptions can carry internal detail that should not go out.
//
// `context` is the route label used for the server-side log only.
function sendServerError(res, err, context) {
  // Deliberately NOT surfaced in the response body: these routes answer
  // unauthenticated callers, and "the database credential is wrong" is not
  // something to advertise. The log is the operator's channel, so it says
  // plainly what to change instead of leaving a bare stack trace to decode.
  if (isDatabaseAuthRejected(err)) {
    console.error(
      `${context}: DATABASE CREDENTIALS REJECTED [DB_AUTH_REJECTED] — Turso is reachable `
      + 'but refused the token. TURSO_AUTH_TOKEN is wrong, expired, or was issued for a '
      + 'different database. Replace it in the deployment environment and REDEPLOY — env '
      + 'changes do not reach an already-built deployment. This is not a transient outage '
      + 'and will not clear on its own.',
      err.message
    );
    return res.status(500).json({ error: 'Server error' });
  }

  if (isDatabaseUnavailable(err)) {
    // Logged at error level with the real reason — this is the line that tells
    // an operator whether to look at Turso or at the deployment's env vars.
    console.error(`${context}: database unavailable —`, err.message);
    res.setHeader('Retry-After', '30');
    return res.status(503).json({
      error: 'The database is temporarily unavailable. Please try again in a moment.',
      code: 'DB_UNAVAILABLE',
    });
  }
  console.error(`${context} error:`, err);
  return res.status(500).json({ error: 'Server error' });
}

module.exports = {
  repo, getReadyDb, parseBody, readRawBody, verifyPaystackPayment,
  requireAdmin, requireMemberRecord, sendServerError, auth,
};
