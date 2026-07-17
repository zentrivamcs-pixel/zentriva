// Auth primitives shared by the Express dev server (server/) and the Vercel
// serverless API (api/). CommonJS + Node crypto only, so both runtimes can
// require it with no extra dependencies.
const crypto = require('crypto');

// Secret used to sign session tokens. Falls back to the Paystack secret in
// local dev so the app still runs, but production should set SESSION_SECRET.
function getSessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured on the server');
  }
  return secret;
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

// --- Password hashing (scrypt, random salt) --------------------------------

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// --- Signed session tokens (HMAC-SHA256, "payload.signature") ---------------

function signToken(payload, ttlSeconds) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const data = b64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

// Returns the decoded payload, or null if missing/tampered/expired.
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// Reads "Authorization: Bearer <token>" and returns the payload, or null.
function getAuthPayload(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!header || !header.startsWith('Bearer ')) return null;
  return verifyToken(header.slice('Bearer '.length).trim());
}

function isAdmin(req) {
  const payload = getAuthPayload(req);
  return !!(payload && payload.role === 'admin');
}

// Returns the member id from a member token, or null.
function getMemberId(req) {
  const payload = getAuthPayload(req);
  return payload && payload.role === 'member' ? payload.sub : null;
}

// Returns the full member token payload ({ sub, v, exp }), or null. Used
// where the token_version must be checked against the database.
function getMemberPayload(req) {
  const payload = getAuthPayload(req);
  return payload && payload.role === 'member' ? payload : null;
}

// Mints a member session token bound to the member's current token_version;
// bumping the version (password change/reset) invalidates it.
function memberToken(memberId, tokenVersion) {
  return signToken(
    { role: 'member', sub: Number(memberId), v: Number(tokenVersion || 0) },
    MEMBER_TOKEN_TTL
  );
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Constant-time string comparison for the admin password check.
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

const ADMIN_TOKEN_TTL = 12 * 60 * 60; // 12 hours
const MEMBER_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  getAuthPayload,
  isAdmin,
  getMemberId,
  getMemberPayload,
  memberToken,
  sha256,
  randomToken,
  safeEqual,
  ADMIN_TOKEN_TTL,
  MEMBER_TOKEN_TTL,
};
