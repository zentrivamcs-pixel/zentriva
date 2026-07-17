const path = require('path');
const Database = require('better-sqlite3');

// The database file lives right here in the project directory.
const db = new Database(path.join(__dirname, 'data.sqlite'));
db.pragma('journal_mode = WAL');

// One table holds every submission. Array fields (skills, etc.) are stored
// as JSON text because SQLite has no native array type.
db.exec(`
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

// Migrations for databases created before these columns existed.
const existingColumns = db.prepare('PRAGMA table_info(members)').all().map((c) => c.name);
const addColumn = (name, ddl) => {
  if (!existingColumns.includes(name)) db.exec(`ALTER TABLE members ADD COLUMN ${ddl}`);
};
addColumn('payment_reference', 'payment_reference TEXT');
addColumn('membership_tier', 'membership_tier TEXT');
addColumn('membership_category', 'membership_category TEXT');
addColumn('password_hash', 'password_hash TEXT');
addColumn('membership_id', 'membership_id TEXT');

// Prevent the same Paystack payment from being used for more than one registration.
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_members_payment_reference
  ON members(payment_reference) WHERE payment_reference IS NOT NULL
`);

// Payment history — mirrors the payments table in the production (Turso)
// schema in api/_lib.js.
db.exec(`
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

module.exports = db;
