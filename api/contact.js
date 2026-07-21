// POST /api/contact — the public contact form on the homepage (no login
// required). Stored as a row in the same inbound_messages table the Resend
// inbox webhook writes to, so it shows up in the existing Admin Inbox.
const { getDb } = require('../shared/db');
const { parseBody } = require('./_lib');
const inbox = require('../shared/inboxRepo');
const { cleanString, cleanEmail } = require('../shared/validation');

// Mirrors src/shared/contact.js's SUPPORT_EMAIL — kept in sync manually,
// same convention as shared/membershipTiers.js.
const SUPPORT_TO_ADDRESS = 'support@zentrivacoop.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseBody(req);
    const name = cleanString(body.name, 120);
    const email = cleanEmail(body.email);
    const message = cleanString(body.message, 5000);
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    const subject = cleanString(body.subject, 200) || `Website contact form — ${name}`;

    const db = getDb();
    await inbox.ensureSchema(db);
    await inbox.createInboundMessage(db, {
      resendId: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: `${name} <${email}>`,
      to: SUPPORT_TO_ADDRESS,
      subject,
      text: message,
      receivedAt: new Date().toISOString(),
    });

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('POST /api/contact error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
