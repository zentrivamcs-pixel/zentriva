// Canonical membership tier pricing for the backend (Express server and
// Vercel serverless functions both require this). Mirrored on the client at
// ctca-business-form/src/shared/membershipTiers.js — kept in sync manually,
// since the client is an ES module bundled by webpack and this is plain
// CommonJS required directly by Node.
const MEMBERSHIP_TIERS = {
  standard: { key: 'standard', name: 'Standard', priceNaira: 5000 },
  premium: { key: 'premium', name: 'Premium', priceNaira: 10000 },
  elite: { key: 'elite', name: 'Elite', priceNaira: 30000 },
};

const DEFAULT_TIER_KEY = 'standard';

function getTier(key) {
  return MEMBERSHIP_TIERS[key] || MEMBERSHIP_TIERS[DEFAULT_TIER_KEY];
}

module.exports = { MEMBERSHIP_TIERS, DEFAULT_TIER_KEY, getTier };
