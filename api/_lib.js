// Shared helpers for the Vercel serverless API (Turso / libSQL).
// Files prefixed with "_" are not treated as routes by Vercel.
const { createClient } = require('@libsql/client/web');
const { getTier } = require('../shared/membershipTiers');
const auth = require('../shared/authUtils');

const ARRAY_FIELDS = ['employment_status', 'skills', 'services_needed', 'offer_category'];

const COLUMNS = [
  'full_name', 'gender', 'membership_category', 'date_of_birth', 'phone_number', 'whatsapp_number', 'email',
  'employment_status', 'profession', 'company_name', 'job_title', 'work_description',
  'owns_business', 'business_name', 'business_type', 'products_services', 'business_location',
  'business_phone', 'social_media', 'years_in_business', 'skills', 'other_skills',
  'services_needed', 'other_services_needed', 'offer_discounts', 'discount_details',
  'open_to_partnerships', 'willing_to_mentor', 'available_to_speak', 'employs_staff',
  'offer_category', 'other_category', 'consent', 'additional_comments', 'membership_tier',
  'payment_reference'
];

// Profile fields a logged-in member may update about themselves (PUT /api/me).
const PROFILE_EDITABLE_FIELDS = [
  'phone_number', 'whatsapp_number', 'profession', 'company_name', 'job_title',
  'work_description', 'business_name', 'business_type', 'products_services',
  'business_location', 'business_phone', 'social_media',
];

// Fields exposed to other members in the directory (consented data only —
// the registration consent covers sharing these for networking/referrals).
const DIRECTORY_FIELDS = [
  'id', 'full_name', 'profession', 'company_name', 'job_title',
  'business_name', 'business_type', 'products_services', 'business_location',
  'business_phone', 'social_media', 'skills', 'offer_category',
  'offer_discounts', 'discount_details', 'email', 'phone_number', 'membership_tier',
];

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Confirms a Paystack transaction actually succeeded, for the right amount
// (the price of the given membership tier) and currency. Returns the
// transaction object on success so callers can record the payment, or null.
async function verifyPaystackPayment(reference, membershipTierKey) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the server');
  }
  const expectedKobo = getTier(membershipTierKey).priceNaira * 100;
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
  );
  const result = await response.json();
  const tx = result && result.data;
  const ok = !!(
    result && result.status && tx &&
    tx.status === 'success' &&
    tx.amount === expectedKobo &&
    tx.currency === 'NGN'
  );
  return ok ? tx : null;
}

let client;
function getClient() {
  if (!client) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error('TURSO_DATABASE_URL is not set');
    }
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
  }
  return client;
}

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name             TEXT,
      gender                TEXT,
      membership_category   TEXT,
      date_of_birth         TEXT,
      phone_number          TEXT,
      whatsapp_number       TEXT,
      email                 TEXT,
      employment_status     TEXT,
      profession            TEXT,
      company_name          TEXT,
      job_title             TEXT,
      work_description      TEXT,
      owns_business         TEXT,
      business_name         TEXT,
      business_type         TEXT,
      products_services     TEXT,
      business_location     TEXT,
      business_phone        TEXT,
      social_media          TEXT,
      years_in_business     TEXT,
      skills                TEXT,
      other_skills          TEXT,
      services_needed       TEXT,
      other_services_needed TEXT,
      offer_discounts       TEXT,
      discount_details      TEXT,
      open_to_partnerships  TEXT,
      willing_to_mentor     TEXT,
      available_to_speak    TEXT,
      employs_staff         TEXT,
      offer_category        TEXT,
      other_category        TEXT,
      consent               INTEGER,
      additional_comments   TEXT,
      payment_reference     TEXT,
      membership_tier       TEXT,
      created_at            TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migrations for tables created before these columns existed. Each ALTER
  // fails harmlessly if the column already exists.
  const migrations = [
    'ALTER TABLE members ADD COLUMN payment_reference TEXT',
    'ALTER TABLE members ADD COLUMN membership_tier TEXT',
    'ALTER TABLE members ADD COLUMN membership_category TEXT',
    'ALTER TABLE members ADD COLUMN password_hash TEXT',
    'ALTER TABLE members ADD COLUMN membership_id TEXT',
  ];
  for (const sql of migrations) {
    try {
      await db.execute(sql);
    } catch {
      // Column already exists — ignore.
    }
  }

  // Prevent the same Paystack payment from being used for more than one registration.
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_members_payment_reference
    ON members(payment_reference) WHERE payment_reference IS NOT NULL
  `);

  // Payment history — written when a registration is verified and by the
  // Paystack webhook, read by the member Billing page and the admin CMS.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id     INTEGER,
      reference     TEXT UNIQUE,
      amount_kobo   INTEGER,
      currency      TEXT,
      status        TEXT,
      channel       TEXT,
      description   TEXT,
      paid_at       TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  schemaReady = true;
}

// "ZNTR-1042-EXE-2026" — stable, human-readable membership number derived
// from the row id, category, and registration year.
function buildMembershipId(id, membershipCategory, createdAt) {
  const year = (createdAt || new Date().toISOString()).slice(0, 4);
  const cat = (membershipCategory || '').startsWith('Executive') ? 'EXE' : 'MBR';
  return `ZNTR-${String(1000 + Number(id))}-${cat}-${year}`;
}

function deserialize(row) {
  const out = { ...row };
  for (const field of ARRAY_FIELDS) {
    try {
      out[field] = row[field] ? JSON.parse(row[field]) : [];
    } catch {
      out[field] = [];
    }
  }
  out.consent = !!row.consent;
  if (typeof out.id === 'bigint') out.id = Number(out.id);
  if (typeof out.member_id === 'bigint') out.member_id = Number(out.member_id);
  return out;
}

// A member row that is safe to send to the member it belongs to.
function sanitizeMember(row) {
  const out = deserialize(row);
  delete out.password_hash;
  out.has_password = !!row.password_hash;
  return out;
}

// A member row reduced to the directory-safe field set.
function toDirectoryEntry(row) {
  const full = deserialize(row);
  const out = {};
  for (const field of DIRECTORY_FIELDS) out[field] = full[field] ?? null;
  return out;
}

function toArgs(body) {
  return COLUMNS.map((col) => {
    const val = body[col];
    if (ARRAY_FIELDS.includes(col)) {
      return JSON.stringify(Array.isArray(val) ? val : []);
    }
    if (col === 'consent') {
      return val ? 1 : 0;
    }
    return val === undefined || val === '' ? null : val;
  });
}

// Vercel parses JSON bodies automatically, but guard against strings/empties.
function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function requireAdmin(req, res) {
  if (auth.isAdmin(req)) return true;
  res.status(401).json({ error: 'Admin authentication required' });
  return false;
}

// Returns the member id from the request's Bearer token, or responds 401.
function requireMember(req, res) {
  const id = auth.getMemberId(req);
  if (id) return id;
  res.status(401).json({ error: 'Login required' });
  return null;
}

module.exports = {
  ARRAY_FIELDS, COLUMNS, PROFILE_EDITABLE_FIELDS, DIRECTORY_FIELDS,
  getClient, ensureSchema, deserialize, sanitizeMember, toDirectoryEntry,
  toArgs, parseBody, verifyPaystackPayment, buildMembershipId,
  requireAdmin, requireMember, auth,
};
