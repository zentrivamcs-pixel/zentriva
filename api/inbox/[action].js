// /api/inbox/:action
//   POST /api/inbox/receive    — Resend's email.received webhook (public,
//                                 verified by Svix signature, not admin auth)
//   GET  /api/inbox/list       — admin: list stored inbound messages
//   POST /api/inbox/mark-read  — admin: toggle a message's read state
// Consolidated into one dynamic route so these three actions share a single
// Vercel serverless function instead of three (Hobby plan caps a deployment
// at 12 functions — see api/auth/[action].js and api/members/[id]/[action].js).
const { requireAdmin } = require('../_lib');
const { getDb } = require('../../shared/db');
const inbox = require('../../shared/inboxRepo');
const { getReceivedEmail } = require('../../shared/email');
const { verifySvixSignature } = require('../../shared/webhookAuth');

// The webhook signature covers the exact raw bytes sent, so body parsing is
// disabled here and every action reads/parses the body itself.
module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function receive(req, res, rawBody) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'RESEND_WEBHOOK_SECRET is not configured' });

  const valid = verifySvixSignature({
    id: req.headers['svix-id'],
    timestamp: req.headers['svix-timestamp'],
    signature: req.headers['svix-signature'],
    body: rawBody,
    secret,
  });
  if (!valid) return res.status(401).json({ error: 'Invalid signature' });

  const event = JSON.parse(rawBody);
  if (event.type === 'email.received' && event.data && event.data.email_id) {
    const full = await getReceivedEmail(event.data.email_id);
    const db = getDb();
    await inbox.ensureSchema(db);
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
  }

  // Always 200 for events we've already handled (or ignored), so Resend
  // doesn't keep retrying them.
  return res.status(200).json({ received: true });
}

async function list(req, res, db) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json(await inbox.listInboundMessages(db));
}

async function markRead(req, res, db, body) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { id, read } = body;
  if (id === undefined) return res.status(400).json({ error: 'id is required' });
  await inbox.setInboundMessageRead(db, id, read !== false);
  return res.status(200).json({ ok: true });
}

module.exports = async (req, res) => {
  const action = req.query.action;

  try {
    const rawBuffer = await readRawBody(req);
    const rawBody = rawBuffer.toString('utf8');

    if (action === 'receive') return await receive(req, res, rawBody);

    // Every other action is admin-only.
    if (!requireAdmin(req, res)) return;
    const db = getDb();
    await inbox.ensureSchema(db);
    const body = rawBody ? JSON.parse(rawBody) : {};

    if (action === 'list') return await list(req, res, db);
    if (action === 'mark-read') return await markRead(req, res, db, body);

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error(`/api/inbox/${action} error:`, err);
    return res.status(500).json({ error: 'Server error' });
  }
};
