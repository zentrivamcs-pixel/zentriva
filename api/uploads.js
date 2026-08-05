// /api/uploads — issues short-lived client tokens for direct-to-Vercel-
// Blob uploads (registration's passport photo, bank-transfer payment proof,
// and a member's own profile photo change). The file itself never passes
// through this function — the browser uploads straight to Blob storage,
// which keeps large images off the 4.5MB serverless request-body limit.
// Requires a Blob store to be linked to the Vercel project (adds
// BLOB_READ_WRITE_TOKEN automatically).
//
// POST used to be reachable by anyone: an unauthenticated caller could mint
// Blob tokens in a loop and use the storage bill — and the domain — as a
// free image host. It can't be gated behind a login, because the passport
// photo is uploaded during registration, before an account exists. So the
// token request is gated on two things a browser on our own site has and a
// script pointed at the endpoint does not: an allowed Origin, and a signed
// ticket from GET /api/uploads. Neither is unforgeable on its own — an
// attacker can request a ticket first. What they buy is a single choke
// point that per-IP rate limiting can be applied to, and the end of casual
// drive-by abuse.
const { handleUpload } = require('@vercel/blob/client');
const { parseBody, auth } = require('./_lib');

const ALLOWED_PREFIXES = ['passports/', 'payment-proofs/'];
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const TICKET_TTL = 10 * 60; // long enough to pick a file, short enough to be useless later

// The site's own origins. APP_BASE_URL is the production one; Vercel preview
// deployments get a generated *.vercel.app host, and localhost covers the
// dev server proxying to this handler.
function isAllowedOrigin(origin) {
  if (!origin) return false;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !local) return false;
  if (local) return true;
  if (url.hostname.endsWith('.vercel.app')) return true;

  const base = process.env.APP_BASE_URL;
  if (!base) return false;
  try {
    const allowed = new URL(base).hostname;
    return url.hostname === allowed || url.hostname === `www.${allowed}`;
  } catch {
    return false;
  }
}

function originOf(req) {
  const origin = req.headers.origin;
  if (origin) return origin;
  // Safari has historically omitted Origin on same-origin XHR; fall back to
  // the Referer's origin rather than locking those browsers out of signup.
  const referer = req.headers.referer;
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  // A short-lived signed ticket, required by POST below. Public by
  // necessity — registration uploads a photo before any account exists —
  // which makes this the endpoint to rate-limit, not an auth barrier.
  if (req.method === 'GET') {
    if (!isAllowedOrigin(originOf(req))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.status(200).json({ ticket: auth.signToken({ role: 'upload' }, TICKET_TTL) });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseBody(req);

    // Two very different callers POST here. `blob.generate-client-token` is
    // the browser asking for an upload token — that one gets checked. The
    // `blob.upload-completed` callback comes from Vercel's servers after
    // the upload finishes: no Origin, no ticket, and handleUpload verifies
    // its signature itself. Gating that one would break every upload at the
    // final step, so it is deliberately left to handleUpload.
    if (body && body.type === 'blob.generate-client-token') {
      if (!isAllowedOrigin(originOf(req))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const ticket = auth.verifyToken(typeof clientPayload === 'string' ? clientPayload : '');
        if (!ticket || ticket.role !== 'upload') {
          throw new Error('This upload link has expired — please reload the page and try again');
        }
        if (!ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
          throw new Error('Uploads are only allowed under passports/ or payment-proofs/');
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('POST /api/uploads error:', err);
    return res.status(400).json({ error: err.message || 'Upload token request failed' });
  }
};
