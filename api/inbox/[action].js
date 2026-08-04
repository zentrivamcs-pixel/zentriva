// /api/inbox/:action — the mail route, both directions.
//   POST /api/inbox/receive     — Resend's email.received webhook (public,
//                                  verified by Svix signature, not admin auth)
//   GET  /api/inbox/list        — admin: list stored inbound messages
//   POST /api/inbox/mark-read   — admin: toggle a message's read state
//   POST /api/inbox/broadcast   — admin: mail every member in an audience
//   GET  /api/inbox/broadcasts  — admin: history of past broadcasts
// Consolidated into one dynamic route so these actions share a single Vercel
// serverless function instead of one each (Hobby plan caps a deployment at
// 12 functions — see api/auth/[action].js and api/members/[id]/[action].js).
const { requireAdmin, readRawBody, getReadyDb, sendServerError, repo } = require('../_lib');
const { getDb } = require('../../shared/db');
const inbox = require('../../shared/inboxRepo');
const { getReceivedEmail, isEmailEnabled, sendBroadcast } = require('../../shared/email');
const { verifySvixSignature } = require('../../shared/webhookAuth');
const { cleanString } = require('../../shared/validation');
const {
  DEFAULT_AUDIENCE, MAX_RECIPIENTS, isValidAudience, selectRecipients,
} = require('../../shared/broadcast');

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

// POST /api/inbox/broadcast — one message to every member in an audience.
// The client sends an audience KEY, never a recipient list: who gets mailed
// is decided here from the database, so a stale or tampered admin page can't
// aim a mailing at addresses that aren't members.
async function broadcast(req, res, db) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await readJsonBody(req);
  const subject = cleanString(body.subject, 200);
  const message = cleanString(body.body, 20000);
  const audience = isValidAudience(body.audience) ? body.audience : null;

  if (!subject) return res.status(400).json({ error: 'A subject is required' });
  if (!message) return res.status(400).json({ error: 'A message is required' });
  if (!audience) return res.status(400).json({ error: 'Unknown audience' });

  if (!isEmailEnabled()) {
    return res.status(503).json({
      error: 'Email is not configured on the server — set RESEND_API_KEY and EMAIL_FROM, then redeploy.',
    });
  }

  // Members live in the members schema, which this route doesn't otherwise
  // touch; getReadyDb returns the same client with that schema ensured.
  const membersDb = await getReadyDb();
  const recipients = selectRecipients(await repo.listMembers(membersDb), audience);

  if (recipients.length === 0) {
    return res.status(400).json({ error: 'No members match that audience — nothing was sent.' });
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return res.status(400).json({
      error: `That audience has ${recipients.length} members, above the ${MAX_RECIPIENTS} per-send limit. Narrow the audience.`,
    });
  }

  const result = await sendBroadcast({ recipients, subject, body: message });

  // Recorded whether or not it fully succeeded — a half-delivered mailing is
  // exactly the case where the admin needs a record afterwards.
  await inbox.createBroadcast(db, {
    subject,
    body: message,
    audience,
    recipientCount: recipients.length,
    sentCount: result.sent,
    failedCount: result.failed,
    error: result.error,
  });

  const payload = {
    recipientCount: recipients.length,
    sent: result.sent,
    failed: result.failed,
    error: result.error,
  };
  // Nothing got through: report it as a failure, not a send.
  return res.status(result.sent === 0 ? 502 : 200).json(payload);
}

async function broadcasts(req, res, db) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json({
    emailEnabled: isEmailEnabled(),
    defaultAudience: DEFAULT_AUDIENCE,
    broadcasts: await inbox.listBroadcasts(db),
  });
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
    if (action === 'broadcast') return await broadcast(req, res, db);
    if (action === 'broadcasts') return await broadcasts(req, res, db);

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    return sendServerError(res, err, `/api/inbox/${action}`);
  }
};

// Set AFTER the handler assignment: `module.exports = handler` replaces the
// exports object, so a `module.exports.config` written above it is discarded.
module.exports.config = { api: { bodyParser: false } };
