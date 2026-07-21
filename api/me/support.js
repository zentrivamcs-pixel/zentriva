// POST /api/me/support — a logged-in member's support request. Stored as a
// row in the same inbound_messages table the Resend inbox webhook writes to
// (shared/inboxRepo.js), so it shows up in the existing Admin Inbox without
// a separate admin view.
const { getReadyDb, parseBody, requireMemberRecord } = require('../_lib');
const inbox = require('../../shared/inboxRepo');

// Mirrors src/shared/contact.js's SUPPORT_EMAIL — kept in sync manually,
// same convention as shared/membershipTiers.js.
const SUPPORT_TO_ADDRESS = 'support@zentrivacoop.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getReadyDb();
    const member = await requireMemberRecord(req, res, db);
    if (!member) return;

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
  } catch (err) {
    console.error('POST /api/me/support error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
