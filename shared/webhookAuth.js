// Verifies webhooks signed in Svix's format (used by Resend's outbound
// webhooks, e.g. the "email.received" inbound-mail event). No SDK
// dependency — same philosophy as shared/email.js, which calls Resend's
// REST API directly.
const crypto = require('crypto');

const TOLERANCE_SECONDS = 5 * 60; // reject signatures on requests older than this

// { id, timestamp, signature } are the raw svix-id / svix-timestamp /
// svix-signature request headers; `body` is the RAW (unparsed) request
// body string — signing covers the exact bytes sent, so a body that's
// already been JSON.parse()'d and re-stringified will not verify.
function verifySvixSignature({ id, timestamp, signature, body, secret }) {
  if (!id || !timestamp || !signature || !secret || typeof body !== 'string') return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64');
  const signedContent = `${id}.${timestamp}.${body}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
  const expectedBytes = Buffer.from(expected, 'base64');

  // svix-signature is space-delimited "v1,<base64sig>" entries — at least
  // one must match (Svix rotates secrets by sending multiple signatures).
  return signature.split(' ').some((entry) => {
    const [version, sig] = entry.split(',');
    if (version !== 'v1' || !sig) return false;
    const sigBytes = Buffer.from(sig, 'base64');
    return sigBytes.length === expectedBytes.length && crypto.timingSafeEqual(sigBytes, expectedBytes);
  });
}

module.exports = { verifySvixSignature };
