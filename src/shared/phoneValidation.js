// Client-side mirror of cleanPhone() in ctca-business-form/shared/validation.js
// (kept in sync manually — see membershipTiers.js for why: one is an ES
// module bundled by webpack, the other is plain CommonJS required by the
// server). Used to give registration-form users immediate feedback instead
// of waiting for the server's 400 after payment.
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// A number typed without a country code is assumed to be Nigerian local
// format (e.g. "0801..."), matching the server default.
export function isValidPhone(value) {
  if (!value || typeof value !== 'string') return false;
  const parsed = parsePhoneNumberFromString(value.trim(), 'NG');
  return !!parsed && parsed.isValid();
}
