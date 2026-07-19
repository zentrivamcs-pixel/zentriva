// Server-side validation and sanitization for everything written to the
// members table. The client validates for UX; THIS is the enforcement —
// nothing reaches the database without passing through here.
//
// Rules applied:
// - unknown fields are ignored (the repo's column whitelist is the backstop)
// - every string is trimmed, stripped of control characters, and length-capped
// - closed-choice fields (gender, category, yes/no, tier…) must be one of
//   their known values or they are dropped
// - arrays must be arrays of bounded strings with a bounded item count
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const { MEMBERSHIP_TIERS } = require('./membershipTiers');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Paystack references are alphanumeric with ._-= (never spaces or quotes).
const REFERENCE_RE = /^[\w.\-=]{1,100}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const GENDERS = ['Male', 'Female'];
const CATEGORIES = ['Executive Member', 'Non-Executive Member'];
const YES_NO = ['Yes', 'No'];
const YEARS_IN_BUSINESS = ['Less than 1 year', '1 – 3 years', '4 – 7 years', 'More than 7 years'];

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200;

// --- Primitive cleaners ------------------------------------------------------

// Trim, drop control characters (keep \n and \t for textareas), cap length.
// Returns null for empty/non-string input.
function cleanString(value, max) {
  if (typeof value !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, max);
}

function cleanEnum(value, allowed) {
  return allowed.includes(value) ? value : null;
}

// Array of short strings, each cleaned; silently drops non-strings and
// caps the item count so nobody can stuff megabytes into a JSON column.
function cleanArray(value, itemMax = 80, maxItems = 40) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, itemMax))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanEmail(value) {
  const email = cleanString(value, 254);
  if (!email || !EMAIL_RE.test(email)) return null;
  return email.toLowerCase();
}

// Vercel Blob upload URLs only — https, no embedded whitespace/control
// characters. Used for passport photos and bank-transfer payment proof.
const BLOB_URL_RE = /^https:\/\/[^\s"'<>]+$/;
function cleanUrl(value, max = 500) {
  const url = cleanString(value, max);
  if (!url || !BLOB_URL_RE.test(url)) return null;
  return url;
}

// Validates a phone number against its own country's numbering plan and
// normalizes it to E.164 (e.g. "+2348012345678") so every stored number is
// in one unambiguous format. A number typed without a country code is
// assumed to be Nigerian local format (e.g. "0801...") since that's the
// default region for Zentriva's membership base; numbers that already
// include a country code (e.g. "+1...") are validated against that country
// instead.
function cleanPhone(value) {
  const raw = cleanString(value, 32);
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw, 'NG');
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

// --- Field specs ---------------------------------------------------------------

// How to clean each writable members column. `required` is enforced only by
// validateRegistration (admin edits may leave fields blank).
const FIELD_SPECS = {
  full_name: { clean: (v) => cleanString(v, 120), required: true },
  gender: { clean: (v) => cleanEnum(v, GENDERS), required: true },
  membership_category: { clean: (v) => cleanEnum(v, CATEGORIES), required: true },
  date_of_birth: { clean: (v) => (typeof v === 'string' && DATE_RE.test(v) ? v : null) },
  phone_number: { clean: cleanPhone, required: true },
  whatsapp_number: { clean: cleanPhone },
  email: { clean: cleanEmail, required: true },
  employment_status: { clean: (v) => cleanArray(v), array: true },
  profession: { clean: (v) => cleanString(v, 200) },
  company_name: { clean: (v) => cleanString(v, 200) },
  job_title: { clean: (v) => cleanString(v, 200) },
  work_description: { clean: (v) => cleanString(v, 2000) },
  owns_business: { clean: (v) => cleanEnum(v, YES_NO) },
  business_name: { clean: (v) => cleanString(v, 200) },
  business_type: { clean: (v) => cleanString(v, 200) },
  products_services: { clean: (v) => cleanString(v, 2000) },
  business_location: { clean: (v) => cleanString(v, 300) },
  business_phone: { clean: cleanPhone },
  social_media: { clean: (v) => cleanString(v, 300) },
  years_in_business: { clean: (v) => cleanEnum(v, YEARS_IN_BUSINESS) },
  skills: { clean: (v) => cleanArray(v), array: true },
  other_skills: { clean: (v) => cleanString(v, 1000) },
  services_needed: { clean: (v) => cleanArray(v), array: true },
  other_services_needed: { clean: (v) => cleanString(v, 500) },
  offer_discounts: { clean: (v) => cleanEnum(v, YES_NO) },
  discount_details: { clean: (v) => cleanString(v, 500) },
  open_to_partnerships: { clean: (v) => cleanEnum(v, YES_NO) },
  willing_to_mentor: { clean: (v) => cleanEnum(v, YES_NO) },
  available_to_speak: { clean: (v) => cleanEnum(v, YES_NO) },
  employs_staff: { clean: (v) => cleanEnum(v, YES_NO) },
  offer_category: { clean: (v) => cleanArray(v), array: true },
  other_category: { clean: (v) => cleanString(v, 200) },
  consent: { clean: (v) => v === true || v === 1 },
  additional_comments: { clean: (v) => cleanString(v, 2000) },
  membership_tier: { clean: (v) => (MEMBERSHIP_TIERS[v] ? v : null), required: true },
  payment_reference: {
    clean: (v) => (typeof v === 'string' && REFERENCE_RE.test(v.trim()) ? v.trim() : null),
    required: true,
  },
  // ID photo for the membership card/verification — uploaded to Vercel Blob
  // client-side before the registration is submitted.
  passport_photo_url: { clean: (v) => cleanUrl(v), required: true },
  // Only required for bank-transfer registrations — checked in the route
  // handler (conditional on payment_method), not here.
  payment_proof_url: { clean: (v) => cleanUrl(v) },
};

// Cleans every known field; unknown keys are dropped.
function cleanFields(body) {
  const out = {};
  for (const [field, spec] of Object.entries(FIELD_SPECS)) {
    out[field] = spec.clean(body ? body[field] : undefined);
    if (spec.array && out[field] === null) out[field] = [];
  }
  return out;
}

// Full validation for a public registration. Returns { value, errors } —
// registration must be rejected when errors is non-empty.
function validateRegistration(body) {
  const value = cleanFields(body);
  const errors = [];

  for (const [field, spec] of Object.entries(FIELD_SPECS)) {
    if (!spec.required) continue;
    const v = value[field];
    if (v === null || v === undefined || (spec.array && v.length === 0)) {
      errors.push(`${field} is missing or invalid`);
    }
  }
  if (body && body.email && !value.email) {
    // Overwrite the generic message with a clearer one for the common case.
    errors.push('email address is not valid');
  }
  if (body && body.phone_number && !value.phone_number) {
    errors.push('phone number is not a valid number for its country/region');
  }
  if (value.employment_status.length === 0) {
    errors.push('at least one employment status is required');
  }
  if (value.consent !== true) {
    errors.push('consent is required to register');
  }

  return { value, errors };
}

// Password for account creation / change. Returns an error string or null.
function passwordError(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`;
  }
  if (password.length > PASSWORD_MAX) {
    return `Password must be at most ${PASSWORD_MAX} characters`;
  }
  return null;
}

// Cleans a member self-service profile update: only the given fields, each
// through its spec. Unknown/never-editable fields are dropped here AND by
// the repo's PROFILE_EDITABLE_FIELDS whitelist. Returns { value, errors } —
// a field that fails its format check (e.g. an unparsable phone number) is
// reported as an error rather than silently saved as blank, since the
// member almost certainly meant to set a value, not clear one.
function cleanProfileUpdate(body, editableFields) {
  const value = {};
  const errors = [];
  if (!body) return { value, errors };
  for (const field of editableFields) {
    if (body[field] === undefined) continue;
    const spec = FIELD_SPECS[field];
    const cleaned = spec ? spec.clean(body[field]) : null;
    if (cleaned === null) {
      // Explicitly clearing a field (empty/whitespace input) is allowed —
      // it becomes '' so the repo writes NULL. Anything else that failed
      // cleaning is a format error.
      const isExplicitClear = body[field] === null || (typeof body[field] === 'string' && body[field].trim() === '');
      if (isExplicitClear) {
        value[field] = '';
      } else {
        errors.push(`${field} is not valid`);
      }
    } else {
      value[field] = cleaned;
    }
  }
  return { value, errors };
}

// Lenient cleaning for admin edits: everything is optional, but every value
// still goes through the same type/length/enum rules.
function cleanAdminWrite(body) {
  return cleanFields(body);
}

module.exports = {
  cleanString, cleanEmail, cleanPhone, cleanArray, cleanEnum, cleanUrl,
  validateRegistration, passwordError, cleanProfileUpdate, cleanAdminWrite,
  PASSWORD_MIN, PASSWORD_MAX,
};
