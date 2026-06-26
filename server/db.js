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

module.exports = db;
