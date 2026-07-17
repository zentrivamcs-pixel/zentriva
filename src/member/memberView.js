// Maps a raw member record from /api/me into the display shape the portal
// components (overview card, membership ID card, badge export) render.
import { getTier } from '../shared/membershipTiers';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// SQLite's datetime('now') produces "YYYY-MM-DD HH:MM:SS" in UTC — convert
// to an ISO string so Date parses it consistently across browsers.
export function parseDbDate(value) {
  if (!value) return null;
  const iso = String(value).includes('T') ? String(value) : `${String(value).replace(' ', 'T')}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatShortDate(date) {
  if (!date) return '—';
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

const TIER_DESCRIPTIONS = {
  standard:
    'You are on the Standard tier with access to core training programs, the digital member network, and email support.',
  premium:
    'You are on the Premium tier with unlimited training access, dedicated mentorship, quarterly workshops, and priority access to new programs.',
  elite:
    'You are on the Elite tier — the complete membership experience, including support for member ventures, pooled resources, and financial inclusion programs.',
};

export function buildMemberView(member) {
  const created = parseDbDate(member.created_at) || new Date();
  const renewal = new Date(created);
  renewal.setFullYear(renewal.getFullYear() + 1); // annual membership
  const tier = getTier(member.membership_tier);
  const active = renewal.getTime() > Date.now();
  const fullName = member.full_name || 'Zentriva Member';

  return {
    id: member.id,
    firstName: fullName.trim().split(/\s+/)[0],
    fullName,
    email: member.email || '',
    phone: member.phone_number || '',
    whatsapp: member.whatsapp_number || '',
    tierLabel: member.membership_category || 'Member',
    tierBadge: `${tier.name} Tier`,
    tierKey: tier.key,
    tierName: tier.name,
    tierFeeNaira: tier.priceNaira,
    tierDescription: TIER_DESCRIPTIONS[tier.key] || TIER_DESCRIPTIONS.standard,
    statusLabel: active ? 'ACTIVE STATUS' : 'RENEWAL DUE',
    active,
    memberSince: String(created.getFullYear()),
    issuedDate: `${MONTHS[created.getMonth()]} ${created.getFullYear()}`,
    renewalDate: renewal,
    nextRenewal: formatShortDate(renewal),
    membershipId: member.membership_id || `ZNTR-${1000 + Number(member.id || 0)}`,
  };
}
