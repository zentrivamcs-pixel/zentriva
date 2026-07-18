// The single data layer for members and payments. Both the Express dev
// server (server/index.js) and the Vercel functions (api/) call these
// functions, so the schema and every query exist exactly once.
//
// All functions take the libSQL client as their first argument (from
// shared/db.js getDb()).

const ARRAY_FIELDS = ['employment_status', 'skills', 'services_needed', 'offer_category'];

// Columns accepted on insert/admin-update (everything except id / created_at
// and the account columns managed by dedicated functions).
const COLUMNS = [
  'full_name', 'gender', 'membership_category', 'date_of_birth', 'phone_number', 'whatsapp_number', 'email',
  'employment_status', 'profession', 'company_name', 'job_title', 'work_description',
  'owns_business', 'business_name', 'business_type', 'products_services', 'business_location',
  'business_phone', 'social_media', 'years_in_business', 'skills', 'other_skills',
  'services_needed', 'other_services_needed', 'offer_discounts', 'discount_details',
  'open_to_partnerships', 'willing_to_mentor', 'available_to_speak', 'employs_staff',
  'offer_category', 'other_category', 'consent', 'additional_comments', 'membership_tier',
  'payment_reference', 'passport_photo_url'
];

// Payment-tracking columns set only through createMember (registration) or
// setPaymentStatus (admin approve/reject) — never through the generic admin
// PUT, so a payment's status can't be silently overwritten by an unrelated
// profile edit.
const PAYMENT_COLUMNS = ['payment_method', 'payment_status', 'payment_proof_url'];

// Profile fields a logged-in member may update about themselves (PUT /api/me).
const PROFILE_EDITABLE_FIELDS = [
  'phone_number', 'whatsapp_number', 'profession', 'company_name', 'job_title',
  'work_description', 'business_name', 'business_type', 'products_services',
  'business_location', 'business_phone', 'social_media', 'passport_photo_url',
];

// Fields exposed to other members in the directory (consented data only —
// the registration consent covers sharing these for networking/referrals).
const DIRECTORY_FIELDS = [
  'id', 'full_name', 'profession', 'company_name', 'job_title',
  'business_name', 'business_type', 'products_services', 'business_location',
  'business_phone', 'social_media', 'skills', 'offer_category',
  'offer_discounts', 'discount_details', 'email', 'phone_number', 'membership_tier',
];

// --- Schema ---------------------------------------------------------------

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
      password_hash         TEXT,
      membership_id         TEXT,
      passport_photo_url    TEXT,
      payment_method        TEXT,
      payment_status        TEXT,
      payment_proof_url     TEXT,
      created_at            TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

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

  // Column migrations for databases created before these columns existed.
  // Each ALTER fails harmlessly if the column is already there.
  const migrations = [
    'ALTER TABLE members ADD COLUMN payment_reference TEXT',
    'ALTER TABLE members ADD COLUMN membership_tier TEXT',
    'ALTER TABLE members ADD COLUMN membership_category TEXT',
    'ALTER TABLE members ADD COLUMN password_hash TEXT',
    'ALTER TABLE members ADD COLUMN membership_id TEXT',
    // Bumped on every password set/clear; member session tokens embed it,
    // so a password change invalidates all previously issued tokens.
    'ALTER TABLE members ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE members ADD COLUMN passport_photo_url TEXT',
    'ALTER TABLE members ADD COLUMN payment_method TEXT',
    'ALTER TABLE members ADD COLUMN payment_status TEXT',
    'ALTER TABLE members ADD COLUMN payment_proof_url TEXT',
    // No DEFAULT on purpose — NULL marks rows that predate this column
    // (see backfill below), while createMember always sets 0 or 1
    // explicitly for every row created after this feature shipped.
    'ALTER TABLE members ADD COLUMN email_verified INTEGER',
  ];
  for (const sql of migrations) {
    try {
      await db.execute(sql);
    } catch {
      // Column already exists — ignore.
    }
  }

  // Backfill: every row that predates payment_status (all Paystack
  // registrations, which were always verified before insert) is 'paid'.
  // Without this, pre-existing members would be wrongly gated as pending.
  await db.execute(
    "UPDATE members SET payment_status = 'paid' WHERE payment_status IS NULL"
  );

  // Backfill: members who registered before email verification existed
  // never got a verification link, so they'd be locked out of login the
  // moment this shipped. Treat every pre-existing row as already verified;
  // createMember sets 0 explicitly for every row from here on.
  await db.execute(
    'UPDATE members SET email_verified = 1 WHERE email_verified IS NULL'
  );

  // Prevent the same Paystack payment from being used for more than one registration.
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_members_payment_reference
    ON members(payment_reference) WHERE payment_reference IS NOT NULL
  `);

  // One account per email. Guarded: if a legacy database already contains
  // duplicate emails the index can't be created — registration still
  // enforces uniqueness app-side (createMember checks inside its
  // transaction), so log and continue rather than taking the API down.
  try {
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email
      ON members(lower(email)) WHERE email IS NOT NULL
    `);
  } catch (err) {
    console.warn('Could not create unique email index (duplicate emails in data?):', err.message);
  }

  // The Billing page filters payments by member.
  await db.execute(
    'CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id)'
  );

  // Single-use password-reset tokens. Only the SHA-256 hash of a token is
  // stored — a database leak exposes nothing usable.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id   INTEGER NOT NULL,
      token_hash  TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      used        INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Single-use email-verification tokens — same shape as password_resets.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id   INTEGER NOT NULL,
      token_hash  TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      used        INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  schemaReady = true;
}

// --- Serialization ----------------------------------------------------------

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
  delete out.token_version;
  out.has_password = !!row.password_hash;
  out.email_verified = !!row.email_verified;
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

// "ZNTR-1042-EXE-2026" — stable, human-readable membership number derived
// from the row id, category, and registration year.
function buildMembershipId(id, membershipCategory, createdAt) {
  const year = (createdAt || new Date().toISOString()).slice(0, 4);
  const cat = (membershipCategory || '').startsWith('Executive') ? 'EXE' : 'MBR';
  return `ZNTR-${String(1000 + Number(id))}-${cat}-${year}`;
}

// --- Members ---------------------------------------------------------------

// Rows leave the data layer sanitized: password_hash never reaches any
// client — not even the admin UI, which only needs has_password.
async function listMembers(db) {
  const result = await db.execute('SELECT * FROM members ORDER BY created_at DESC');
  return result.rows.map(sanitizeMember);
}

async function getMember(db, id) {
  const result = await db.execute({ sql: 'SELECT * FROM members WHERE id = ?', args: [id] });
  return result.rows[0] || null;
}

async function emailExists(db, email) {
  const result = await db.execute({
    sql: 'SELECT 1 FROM members WHERE lower(email) = lower(?) LIMIT 1',
    args: [String(email).trim()],
  });
  return result.rows.length > 0;
}

// Thrown by createMember so route handlers can map data conflicts to clear
// HTTP responses without string-matching driver errors.
class ConflictError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ConflictError';
    this.code = code; // 'DUPLICATE_EMAIL' | 'DUPLICATE_REFERENCE'
  }
}

// Creates a member atomically: insert + membership number + account password
// + payment record all commit together or not at all. `paymentTx` is the
// verified Paystack transaction, or a synthetic equivalent built by the
// caller for a bank-transfer registration (may be null in edge cases where
// no payment row is wanted). `passwordHash` (already hashed — never a
// plaintext password) activates the member's portal account at registration
// time; when null the member can still activate later via the claim flow.
// `paymentMeta` is { method: 'paystack'|'bank_transfer', status: 'paid'|'pending_review', proofUrl }.
async function createMember(db, body, paymentTx, passwordHash, paymentMeta) {
  const tx = await db.transaction('write');
  try {
    // App-level uniqueness checks inside the transaction, so the answer
    // can't change between check and insert.
    const dupEmail = await tx.execute({
      sql: 'SELECT 1 FROM members WHERE lower(email) = lower(?) LIMIT 1',
      args: [String(body.email || '').trim()],
    });
    if (dupEmail.rows.length > 0) {
      throw new ConflictError('DUPLICATE_EMAIL', 'This email is already registered');
    }
    const dupRef = await tx.execute({
      sql: 'SELECT 1 FROM members WHERE payment_reference = ? LIMIT 1',
      args: [body.payment_reference],
    });
    if (dupRef.rows.length > 0) {
      throw new ConflictError('DUPLICATE_REFERENCE', 'This payment has already been used for a registration');
    }

    // Captured once and reused for both the row's created_at and the
    // membership number's embedded year — relying on two separate clock
    // reads (JS now vs. SQLite's own datetime('now')) risked the two
    // drifting by a year for anyone registering right at a year boundary,
    // which would then desync the ID number from "Member Since"/"Date
    // Issued" on the card forever.
    const now = new Date().toISOString();
    const placeholders = COLUMNS.map(() => '?').join(', ');
    const result = await tx.execute({
      sql: `INSERT INTO members (${COLUMNS.join(', ')}, created_at) VALUES (${placeholders}, ?)`,
      args: [...toArgs(body), now],
    });
    const newId = Number(result.lastInsertRowid);

    await tx.execute({
      sql: `UPDATE members
            SET membership_id = ?, password_hash = ?, payment_method = ?, payment_status = ?, payment_proof_url = ?, email_verified = 0
            WHERE id = ?`,
      args: [
        buildMembershipId(newId, body.membership_category, now), passwordHash || null,
        (paymentMeta && paymentMeta.method) || null,
        (paymentMeta && paymentMeta.status) || null,
        (paymentMeta && paymentMeta.proofUrl) || null,
        newId,
      ],
    });

    if (paymentTx) {
      await tx.execute({
        sql: `INSERT INTO payments (member_id, reference, amount_kobo, currency, status, channel, description, paid_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(reference) DO UPDATE SET member_id = excluded.member_id`,
        args: [
          newId, paymentTx.reference, paymentTx.amount, paymentTx.currency, paymentTx.status,
          paymentTx.channel || null,
          `${body.membership_tier || 'standard'} tier registration`,
          paymentTx.paid_at || paymentTx.paidAt || null,
        ],
      });
    }

    await tx.commit();
    return getMember(db, newId);
  } catch (err) {
    try { await tx.rollback(); } catch { /* already rolled back/closed */ }
    // Map unique-index violations (race that beat the SELECT) to the same
    // typed errors as the explicit checks.
    if (err.message && err.message.includes('idx_members_email')) {
      throw new ConflictError('DUPLICATE_EMAIL', 'This email is already registered');
    }
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      throw new ConflictError('DUPLICATE_REFERENCE', 'This payment has already been used for a registration');
    }
    throw err;
  }
}

// Admin full-row update.
async function updateMember(db, id, body) {
  const existing = await getMember(db, id);
  if (!existing) return null;
  const assignments = COLUMNS.map((col) => `${col} = ?`).join(', ');
  await db.execute({
    sql: `UPDATE members SET ${assignments} WHERE id = ?`,
    args: [...toArgs(body), id],
  });
  return getMember(db, id);
}

async function deleteMember(db, id) {
  const result = await db.execute({ sql: 'DELETE FROM members WHERE id = ?', args: [id] });
  return result.rowsAffected > 0;
}

// --- Member accounts ---------------------------------------------------------

async function findByEmailWithPassword(db, email) {
  const result = await db.execute({
    sql: 'SELECT * FROM members WHERE lower(email) = lower(?) AND password_hash IS NOT NULL',
    args: [String(email).trim()],
  });
  return result.rows[0] || null;
}

async function findByEmailAndReference(db, email, reference) {
  const result = await db.execute({
    sql: 'SELECT * FROM members WHERE lower(email) = lower(?) AND payment_reference = ?',
    args: [String(email).trim(), String(reference).trim()],
  });
  return result.rows[0] || null;
}

// Sets the password and bumps token_version so all previously issued
// session tokens for this member become invalid. Returns the new version
// so the caller can mint a fresh token for the member's current session.
async function setPassword(db, id, passwordHash) {
  await db.execute({
    sql: 'UPDATE members SET password_hash = ?, token_version = COALESCE(token_version, 0) + 1 WHERE id = ?',
    args: [passwordHash, id],
  });
  const member = await getMember(db, id);
  return Number(member?.token_version || 0);
}

// Admin stopgap: removes the member's password (and kills their sessions),
// so they can re-activate through the claim flow or a reset link.
async function clearPassword(db, id) {
  const existing = await getMember(db, id);
  if (!existing) return null;
  await db.execute({
    sql: 'UPDATE members SET password_hash = NULL, token_version = COALESCE(token_version, 0) + 1 WHERE id = ?',
    args: [id],
  });
  return getMember(db, id);
}

// --- Password reset tokens ------------------------------------------------------

async function createPasswordReset(db, memberId, tokenHash, expiresAtIso) {
  await db.execute({
    sql: 'INSERT INTO password_resets (member_id, token_hash, expires_at) VALUES (?, ?, ?)',
    args: [memberId, tokenHash, expiresAtIso],
  });
}

// Atomically marks a valid (unused, unexpired) reset token as used and
// returns its member_id — or null if the token is unknown/expired/spent.
async function consumePasswordReset(db, tokenHash) {
  const result = await db.execute({
    sql: `UPDATE password_resets
          SET used = 1
          WHERE token_hash = ? AND used = 0 AND expires_at > ?
          RETURNING member_id`,
    args: [tokenHash, new Date().toISOString()],
  });
  return result.rows[0] ? Number(result.rows[0].member_id) : null;
}

// --- Email verification tokens ------------------------------------------------

async function createEmailVerification(db, memberId, tokenHash, expiresAtIso) {
  await db.execute({
    sql: 'INSERT INTO email_verifications (member_id, token_hash, expires_at) VALUES (?, ?, ?)',
    args: [memberId, tokenHash, expiresAtIso],
  });
}

// Atomically marks a valid (unused, unexpired) verification token as used
// and returns its member_id — or null if the token is unknown/expired/spent.
async function consumeEmailVerification(db, tokenHash) {
  const result = await db.execute({
    sql: `UPDATE email_verifications
          SET used = 1
          WHERE token_hash = ? AND used = 0 AND expires_at > ?
          RETURNING member_id`,
    args: [tokenHash, new Date().toISOString()],
  });
  return result.rows[0] ? Number(result.rows[0].member_id) : null;
}

async function markEmailVerified(db, memberId) {
  await db.execute({
    sql: 'UPDATE members SET email_verified = 1 WHERE id = ?',
    args: [memberId],
  });
}

// Loads a member for /api/me, backfilling the membership number for rows
// registered before membership IDs existed.
async function getMemberWithMembershipId(db, id) {
  let member = await getMember(db, id);
  if (!member) return null;
  if (!member.membership_id) {
    await db.execute({
      sql: 'UPDATE members SET membership_id = ? WHERE id = ?',
      args: [buildMembershipId(member.id, member.membership_category, member.created_at), id],
    });
    member = await getMember(db, id);
  }
  return member;
}

// Member self-service profile update; only PROFILE_EDITABLE_FIELDS are applied.
async function updateProfile(db, id, body) {
  const updates = PROFILE_EDITABLE_FIELDS.filter((f) => body[f] !== undefined);
  if (updates.length === 0) return { updated: false, member: null };
  const assignments = updates.map((f) => `${f} = ?`).join(', ');
  const args = updates.map((f) => (body[f] === '' ? null : body[f]));
  await db.execute({
    sql: `UPDATE members SET ${assignments} WHERE id = ?`,
    args: [...args, id],
  });
  return { updated: true, member: await getMember(db, id) };
}

// --- Directory ----------------------------------------------------------------

async function listDirectory(db) {
  const result = await db.execute(
    'SELECT * FROM members WHERE consent = 1 ORDER BY full_name COLLATE NOCASE ASC'
  );
  return result.rows.map(toDirectoryEntry);
}

// Admin approve/reject for a pending bank-transfer registration. Also
// updates the matching payments row so billing history reflects the
// decision. Returns the updated member, or null if not found.
async function setPaymentStatus(db, id, status) {
  const existing = await getMember(db, id);
  if (!existing) return null;
  await db.execute({
    sql: 'UPDATE members SET payment_status = ? WHERE id = ?',
    args: [status, id],
  });
  if (existing.payment_reference) {
    await db.execute({
      sql: 'UPDATE payments SET status = ? WHERE reference = ?',
      args: [status, existing.payment_reference],
    });
  }
  return getMember(db, id);
}

// --- Payments -------------------------------------------------------------------

async function listPaymentsForMember(db, memberId) {
  const result = await db.execute({
    sql: `SELECT id, reference, amount_kobo, currency, status, channel, description, paid_at, created_at
          FROM payments WHERE member_id = ?
          ORDER BY COALESCE(paid_at, created_at) DESC`,
    args: [memberId],
  });
  return result.rows.map(deserialize);
}

// Upsert from the Paystack webhook; links to a member when the reference
// matches a registration.
async function recordWebhookPayment(db, tx) {
  const memberResult = await db.execute({
    sql: 'SELECT id FROM members WHERE payment_reference = ?',
    args: [tx.reference],
  });
  const memberId = memberResult.rows[0] ? Number(memberResult.rows[0].id) : null;

  await db.execute({
    sql: `INSERT INTO payments (member_id, reference, amount_kobo, currency, status, channel, description, paid_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(reference) DO UPDATE SET
            status = excluded.status,
            paid_at = excluded.paid_at,
            member_id = COALESCE(payments.member_id, excluded.member_id)`,
    args: [
      memberId, tx.reference, tx.amount, tx.currency, tx.status,
      tx.channel || null,
      (tx.metadata && tx.metadata.membership_tier)
        ? `${tx.metadata.membership_tier} tier payment`
        : 'Paystack payment',
      tx.paid_at || tx.paidAt || null,
    ],
  });
}

module.exports = {
  ARRAY_FIELDS, COLUMNS, PAYMENT_COLUMNS, PROFILE_EDITABLE_FIELDS, DIRECTORY_FIELDS,
  ensureSchema, deserialize, sanitizeMember, toDirectoryEntry, toArgs,
  buildMembershipId, ConflictError,
  listMembers, getMember, emailExists, createMember, updateMember, deleteMember,
  findByEmailWithPassword, findByEmailAndReference, setPassword, clearPassword,
  createPasswordReset, consumePasswordReset,
  createEmailVerification, consumeEmailVerification, markEmailVerified,
  getMemberWithMembershipId, updateProfile, listDirectory,
  listPaymentsForMember, recordWebhookPayment, setPaymentStatus,
};
