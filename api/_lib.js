// Shared helpers for the Vercel serverless API. Files prefixed with "_" are
// not treated as routes by Vercel. All data access lives in
// shared/membersRepo.js (one schema + one set of queries for every runtime);
// this module adds the HTTP-side concerns: auth guards, body parsing, and
// Paystack verification.
const { getDb } = require('../shared/db');
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

module.exports = {
  repo, getReadyDb, parseBody, verifyPaystackPayment,
  requireAdmin, requireMemberRecord, auth,
};
