// /api/me[...] — the logged-in member's own account:
//   GET/PUT /api/me           — read/update own profile
//   POST    /api/me/password  — change password
//   GET     /api/me/payments  — own payment history
//   POST    /api/me/support   — send a support message
// Consolidated into one optional catch-all route so these four endpoints
// share a single Vercel serverless function instead of four (Hobby plan
// caps a deployment at 12 functions — see api/auth/[action].js,
// api/inbox/[action].js, and api/members/[id]/[action].js).
const { repo, getReadyDb, parseBody, requireMemberRecord, auth } = require('../_lib');
const { cleanProfileUpdate, passwordError } = require('../../shared/validation');
const inbox = require('../../shared/inboxRepo');

// Mirrors src/shared/contact.js's SUPPORT_EMAIL — kept in sync manually,
// same convention as shared/membershipTiers.js.
const SUPPORT_TO_ADDRESS = 'support@zentrivacoop.com';

async function index(req, res, db, member) {
  if (req.method === 'GET') {
    return res.status(200).json(repo.sanitizeMember(member));
  }

  if (req.method === 'PUT') {
    // Cleaned (trimmed, length-capped) before the repo's field whitelist.
    const { value: cleaned, errors } = cleanProfileUpdate(parseBody(req), repo.PROFILE_EDITABLE_FIELDS);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }
    const { updated, member: fresh } = await repo.updateProfile(db, member.id, cleaned);
    if (!updated) {
      return res.status(400).json({ error: 'No editable fields provided' });
    }
    return res.status(200).json(repo.sanitizeMember(fresh));
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}

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
  const segments = [].concat(req.query.action || []);
  const action = segments[0];

  try {
    if (segments.length > 1) return res.status(404).json({ error: 'Not found' });

    const db = await getReadyDb();
    const member = await requireMemberRecord(req, res, db);
    if (!member) return;

    if (!action) return await index(req, res, db, member);
    const handler = ACTIONS[action];
    if (!handler) return res.status(404).json({ error: 'Not found' });
    return await handler(req, res, db, member);
  } catch (err) {
    console.error(`/api/me${action ? '/' + action : ''} error:`, err);
    return res.status(500).json({ error: 'Server error' });
  }
};
