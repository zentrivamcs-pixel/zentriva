// Shared helpers for the Vercel serverless API (Turso / libSQL).
// Files prefixed with "_" are not treated as routes by Vercel.
const { createClient } = require('@libsql/client/web');

const ARRAY_FIELDS = ['employment_status', 'skills', 'services_needed', 'offer_category'];

const COLUMNS = [
  'full_name', 'gender', 'date_of_birth', 'phone_number', 'whatsapp_number', 'email',
  'employment_status', 'profession', 'company_name', 'job_title', 'work_description',
  'owns_business', 'business_name', 'business_type', 'products_services', 'business_location',
  'business_phone', 'social_media', 'years_in_business', 'skills', 'other_skills',
  'services_needed', 'other_services_needed', 'offer_discounts', 'discount_details',
  'open_to_partnerships', 'willing_to_mentor', 'available_to_speak', 'employs_staff',
  'offer_category', 'other_category', 'consent', 'additional_comments'
];

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
      created_at            TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  schemaReady = true;
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

module.exports = {
  ARRAY_FIELDS, COLUMNS, getClient, ensureSchema, deserialize, toArgs, parseBody
};
