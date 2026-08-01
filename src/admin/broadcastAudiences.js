// Mirror of AUDIENCES in shared/broadcast.js — CRA can't import from outside
// src/, so the keys and labels are kept in sync by hand (same convention as
// src/shared/membershipTiers.js). Keep the two files identical in meaning:
// this copy only previews the recipient count in the UI, while the server
// decides who is actually mailed.
export const BROADCAST_AUDIENCES = [
  { key: 'all', label: 'All members', hint: 'Everyone on the register with an email address.' },
  { key: 'paid', label: 'Paid members', hint: 'Registration fee confirmed.' },
  { key: 'pending', label: 'Payment pending review', hint: 'Bank transfer proof not yet approved.' },
  { key: 'verified', label: 'Verified email addresses', hint: 'Members who confirmed their email.' },
  { key: 'unverified', label: 'Unverified email addresses', hint: "Haven't clicked their verification link yet." },
];

const MATCHERS = {
  all: () => true,
  paid: (m) => m.payment_status === 'paid',
  pending: (m) => m.payment_status === 'pending_review',
  verified: (m) => !!m.email_verified,
  unverified: (m) => !m.email_verified,
};

// Same rule the server applies: a member with no email address is not a
// recipient, and one address only ever counts once.
export function countAudience(members, audienceKey) {
  const match = MATCHERS[audienceKey] || MATCHERS.all;
  const seen = new Set();
  for (const member of members) {
    if (!match(member)) continue;
    const email = (member.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) continue;
    seen.add(email);
  }
  return seen.size;
}
