// Audience rules and templating for admin broadcast email (Admin → Send Mail).
// Lives here rather than inside a route so the Vercel function
// (api/inbox/[action].js) and the Express dev server (server/index.js) pick
// recipients by exactly the same rules.
//
// The admin UI mirrors these keys and labels in
// src/admin/broadcastAudiences.js — CRA can't import from outside src/, so
// the two are kept in sync by hand (same convention as membershipTiers.js).
// The UI copy is only a preview of the count; THIS module decides who is
// actually mailed, from rows read server-side.
const { buildMembershipId } = require('./membersRepo');

const AUDIENCES = {
  all: {
    label: 'All members',
    match: () => true,
  },
  paid: {
    label: 'Paid members',
    match: (m) => m.payment_status === 'paid',
  },
  pending: {
    label: 'Payment pending review',
    match: (m) => m.payment_status === 'pending_review',
  },
  unpaid: {
    label: 'Fee unpaid (pay later)',
    match: (m) => m.payment_status === 'pending_payment',
  },
  verified: {
    label: 'Verified email addresses',
    match: (m) => !!m.email_verified,
  },
  unverified: {
    label: 'Unverified email addresses',
    match: (m) => !m.email_verified,
  },
};

const DEFAULT_AUDIENCE = 'all';

// One send is a handful of batched requests to Resend inside a single
// serverless invocation, so it has to finish inside the function's time
// budget. Past this the send is refused outright rather than half delivered
// with no record of where it stopped.
const MAX_RECIPIENTS = 1000;

function isValidAudience(key) {
  return Object.prototype.hasOwnProperty.call(AUDIENCES, key);
}

// Members matching the audience, reduced to what the mailer needs. Rows
// without a usable email are skipped, and a duplicated address only ever
// gets one copy of the message.
function selectRecipients(members, audienceKey) {
  const audience = AUDIENCES[audienceKey] || AUDIENCES[DEFAULT_AUDIENCE];
  const seen = new Set();
  const recipients = [];

  for (const member of members) {
    if (!audience.match(member)) continue;

    const email = typeof member.email === 'string' ? member.email.trim() : '';
    if (!email || !email.includes('@')) continue;

    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    recipients.push({
      email,
      name: member.full_name || 'Member',
      // Older rows were created before membership_id was stored, so derive
      // the same value the member portal shows rather than mailing a blank.
      membershipId: member.membership_id
        || buildMembershipId(member.id, member.membership_category, member.created_at),
    });
  }

  return recipients;
}

// Placeholders an admin can drop into the subject or body. Kept deliberately
// small — every one of these is a field we always have a value for, so a
// broadcast can never go out saying "Hi ,".
function applyPlaceholders(text, recipient) {
  if (!text) return '';
  const firstName = String(recipient.name).trim().split(/\s+/)[0] || recipient.name;
  return String(text)
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*name\s*\}\}/gi, recipient.name)
    .replace(/\{\{\s*membership_id\s*\}\}/gi, recipient.membershipId || '');
}

module.exports = {
  AUDIENCES, DEFAULT_AUDIENCE, MAX_RECIPIENTS,
  isValidAudience, selectRecipients, applyPlaceholders,
};
