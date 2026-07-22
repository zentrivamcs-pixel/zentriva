// POST /api/me/password — change password.
// GET  /api/me/payments — own payment history.
// POST /api/me/support  — send a support message.
// Consolidated into one dynamic route so these three actions share a single
// Vercel serverless function instead of three (Hobby plan caps a deployment
// at 12 functions — see api/auth/[action].js, api/inbox/[action].js, and
// api/members/[id]/[action].js). The base /api/me route (GET/PUT, no
// action segment) stays in its own file: Vercel's non-Next.js /api routing
// doesn't support an "optional" catch-all, only single dynamic segments and
// required catch-alls, so a bare /api/me can't be matched from here.
const { repo, getReadyDb, parseBody, requireMemberRecord, auth } = require('../_lib');
const { passwordError } = require('../../shared/validation');
const inbox = require('../../shared/inboxRepo');

// Mirrors src/shared/contact.js's SUPPORT_EMAIL — kept in sync manually,
// same convention as shared/membershipTiers.js.
const SUPPORT_TO_ADDRESS = 'support@zentrivacoop.com';

// Bumps the member's token_version (logging out every other session) and
// returns a fresh token so the current session stays signed in.
async function password(req, res, db, member) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { current_password, new_password } = parseBody(req);
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }
  const pwErr = passwordError(new_password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  if (!auth.verifyPassword(String(current_password), member.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const newVersion = await repo.setPassword(db, member.id, auth.hashPassword(String(new_password)));
  return res.status(200).json({ ok: true, token: auth.memberToken(member.id, newVersion) });
}

async function payments(req, res, db, member) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json(await repo.listPaymentsForMember(db, member.id));
}

// Stored as a row in the same inbound_messages table the Resend inbox
// webhook writes to, so it shows up in the existing Admin Inbox.
async function support(req, res, db, member) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subject, message } = parseBody(req);
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  const trimmedSubject = subject && String(subject).trim()
    ? String(subject).trim().slice(0, 200)
    : '(no subject)';
  const trimmedMessage = String(message).trim().slice(0, 5000);

  await inbox.ensureSchema(db);
  await inbox.createInboundMessage(db, {
    resendId: `member-${member.id}-${Date.now()}`,
    from: member.email,
    to: SUPPORT_TO_ADDRESS,
    subject: trimmedSubject,
    text: trimmedMessage,
    receivedAt: new Date().toISOString(),
  });

  return res.status(201).json({ ok: true });
}

const ACTIONS = { password, payments, support };

module.exports = async (req, res) => {
  const handler = ACTIONS[req.query.action];
  if (!handler) return res.status(404).json({ error: 'Not found' });

  try {
    const db = await getReadyDb();
    const member = await requireMemberRecord(req, res, db);
    if (!member) return;

    return await handler(req, res, db, member);
  } catch (err) {
    console.error(`/api/me/${req.query.action} error:`, err);
    return res.status(500).json({ error: 'Server error' });
  }
};
