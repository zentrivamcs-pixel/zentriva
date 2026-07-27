// /api/inbox/:action
//   POST /api/inbox/receive    — Resend's email.received webhook (public,
//                                 verified by Svix signature, not admin auth)
//   GET  /api/inbox/list       — admin: list stored inbound messages
//   POST /api/inbox/mark-read  — admin: toggle a message's read state
// Consolidated into one dynamic route so these three actions share a single
// Vercel serverless function instead of three (Hobby plan caps a deployment
// at 12 functions — see api/auth/[action].js and api/members/[id]/[action].js).
const { requireAdmin, readRawBody } = require('../_lib');
const { getDb } = require('../../shared/db');
const inbox = require('../../shared/inboxRepo');
const { getReceivedEmail } = require('../../shared/email');
const { verifySvixSignature } = require('../../shared/webhookAuth');

async function receive(req, res, db) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('POST /api/inbox/receive: RESEND_WEBHOOK_SECRET is not set — inbound mail cannot be accepted');
    return res.status(500).json({ error: 'RESEND_WEBHOOK_SECRET is not configured' });
  }

  // The signature covers the exact bytes Resend sent, so this must be the
  // raw body, never a re-parsed object (see readRawBody in api/_lib.js).
  const rawBody = await readRawBody(req);
  const valid = verifySvixSignature({
    id: req.headers['svix-id'],
    timestamp: req.headers['svix-timestamp'],
    signature: req.headers['svix-signature'],
    body: rawBody,
    secret,
  });
  if (!valid) {
    // Logged with enough detail to tell the three failure modes apart
    // (headers missing, body lost before it got here, wrong secret) without
    // ever writing the secret or the message itself to the logs.
    console.error('POST /api/inbox/receive: signature rejected', {
      hasId: !!req.headers['svix-id'],
      hasTimestamp: !!req.headers['svix-timestamp'],
      hasSignature: !!req.headers['svix-signature'],
      bodyLength: rawBody.length,
    });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Body is not valid JSON' });
  }

  if (event.type !== 'email.received' || !event.data || !event.data.email_id) {
    // Nothing to store (a different event type) — 200 so Resend stops.
    return res.status(200).json({ received: true });
  }

  // The webhook payload only carries metadata; the body/attachments come
  // from a second call. If that call fails, the metadata is still stored so
  // the admin sees that mail arrived, and a non-200 asks Resend to retry —
  // createInboundMessage upserts, so the retry fills in the body.
  let full;
  try {
    full = await getReceivedEmail(event.data.email_id);
  } catch (err) {
    console.error('POST /api/inbox/receive: could not fetch the full message:', err.message);
    await inbox.createInboundMessage(db, {
      resendId: event.data.email_id,
      from: event.data.from,
      to: event.data.to,
      subject: event.data.subject,
      receivedAt: event.data.created_at,
    });
    return res.status(502).json({ error: 'Could not fetch the message body from Resend' });
  }

  await inbox.createInboundMessage(db, {
    resendId: full.id,
    from: full.from,
    to: Array.isArray(full.to) ? full.to.join(', ') : full.to,
    subject: full.subject,
    text: full.text,
    html: full.html,
    attachments: full.attachments,
    receivedAt: full.created_at,
  });

  // Always 200 for events we've already handled, so Resend doesn't keep
  // retrying them.
  return res.status(200).json({ received: true });
}

async function list(req, res, db) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json(await inbox.listInboundMessages(db));
}

// This route turns Vercel's body helpers off for the webhook's sake, so the
// admin POSTs parse the body themselves. readRawBody works either way.
async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function markRead(req, res, db) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { id, read } = await readJsonBody(req);
  if (id === undefined) return res.status(400).json({ error: 'id is required' });
  await inbox.setInboundMessageRead(db, id, read !== false);
  return res.status(200).json({ ok: true });
}

module.exports = async (req, res) => {
  const action = req.query.action;

  try {
    const db = getDb();
    await inbox.ensureSchema(db);

    if (action === 'receive') return await receive(req, res, db);

    // Every other action is admin-only.
    if (!requireAdmin(req, res)) return;
    if (action === 'list') return await list(req, res, db);
    if (action === 'mark-read') return await markRead(req, res, db);

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error(`/api/inbox/${action} error:`, err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Set AFTER the handler assignment: `module.exports = handler` replaces the
// exports object, so a `module.exports.config` written above it is discarded.
module.exports.config = { api: { bodyParser: false } };
