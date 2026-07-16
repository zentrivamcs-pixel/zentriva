// Canonical membership tier pricing for the client. Mirrored on the backend
// at ctca-business-form/shared/membershipTiers.js (kept in sync manually —
// the two can't share a module since one is an ES module bundled by webpack
// and the other is plain CommonJS required by the Express/Vercel servers).
export const MEMBERSHIP_TIERS = {
  standard: { key: 'standard', name: 'Standard', priceNaira: 5000 },
  premium: { key: 'premium', name: 'Premium', priceNaira: 10000 },
  elite: { key: 'elite', name: 'Elite', priceNaira: 30000 },
};

export const DEFAULT_TIER_KEY = 'standard';

export function getTier(key) {
  return MEMBERSHIP_TIERS[key] || MEMBERSHIP_TIERS[DEFAULT_TIER_KEY];
}
