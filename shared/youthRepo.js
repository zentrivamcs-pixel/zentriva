// Data layer for the CTCA Youth & Children Program registration
// ("Seek Ye First The Kingdom Of God"), served from ctca.zentrivacoop.com/register
// (the youth-register/ site). Mirrors shared/skillsRepo.js: one schema, one set
// of queries, shared by the Express dev server and the Vercel function.
//
// Registrants are NOT members: no account, no fee. Each one is placed in one
// of two groups, balanced by age grade + gender, and gets a tag (KF-001,
// KS-001, CO-001 for coordinators) that is printed on their badge.

const GROUPS = { KF: 'Kingdom Finders', KS: 'Kingdom Seekers', CO: 'Coordinator' };
const GENDERS = ['Male', 'Female'];
const GRADES = [
  ['Children (under 13)', 0, 12],
  ['Teens (13–17)', 13, 17],
  ['Youth (18–30)', 18, 30],
  ['Adults (31+)', 31, 200],
];

let schemaReady = false;

async function ensureSchema(db) {
  if (schemaReady) return;

  // UNIQUE(name_key, age) is the "already registered" rule; UNIQUE(code, seq)
  // backs the tag numbering so a tag can never be handed out twice.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS youth_registrants (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tag         TEXT NOT NULL UNIQUE,
      code        TEXT NOT NULL,
      seq         INTEGER NOT NULL,
      full_name   TEXT NOT NULL,
      name_key    TEXT NOT NULL,
      age         INTEGER NOT NULL,
      gender      TEXT NOT NULL,
      age_grade   TEXT NOT NULL,
      group_name  TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      UNIQUE (name_key, age),
      UNIQUE (code, seq)
    )
  `);

  // Failed organiser-PIN / coordinator-code attempts, for the lockout.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS youth_auth_failures (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      kind       TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  schemaReady = true;
}

function gradeFor(age) {
  const g = GRADES.find(([, lo, hi]) => age >= lo && age <= hi);
  return g ? g[0] : GRADES[3][0];
}

function nameKey(name) {
  return String(name).toLowerCase().replace(/\s+/g, ' ').trim();
}

// Returns { value } or { error } — the error text is shown to the registrant.
function cleanPerson(body) {
  const raw = typeof body.name === 'string' ? body.name : '';
  // Leading = + - @ would make Excel/Sheets treat an exported name as a formula.
  // eslint-disable-next-line no-control-regex
  const name = raw.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim()
    .replace(/^[=+\-@]+\s*/, '').slice(0, 80);
  const age = parseInt(body.age, 10);
  if (name.split(' ').length < 2) return { error: 'Please enter your full name (first and last).' };
  if (!(age >= 1 && age <= 120)) return { error: 'Please enter a valid age.' };
  if (!GENDERS.includes(body.gender)) return { error: 'Please choose a gender.' };
  return { value: { name, age, gender: body.gender } };
}

function toPublic(row, existing) {
  return {
    tag: row.tag,
    name: row.full_name,
    age: Number(row.age),
    gender: row.gender,
    grade: row.age_grade,
    group: row.group_name,
    code: row.code,
    existing: !!existing,
  };
}

async function findRegistrant(db, person) {
  const result = await db.execute({
    sql: 'SELECT * FROM youth_registrants WHERE name_key = ? AND age = ? LIMIT 1',
    args: [nameKey(person.name), person.age],
  });
  return result.rows[0] || null;
}

// Fewer people of the same age grade + gender wins; then the smaller group;
// then a coin toss.
async function chooseGroup(db, person) {
  const result = await db.execute({
    sql: `SELECT code,
                 COUNT(*) AS total,
                 SUM(CASE WHEN age_grade = ? AND gender = ? THEN 1 ELSE 0 END) AS same
          FROM youth_registrants WHERE code IN ('KF', 'KS') GROUP BY code`,
    args: [gradeFor(person.age), person.gender],
  });
  const stats = { KF: { total: 0, same: 0 }, KS: { total: 0, same: 0 } };
  for (const r of result.rows) stats[r.code] = { total: Number(r.total), same: Number(r.same) };
  if (stats.KF.same !== stats.KS.same) return stats.KF.same < stats.KS.same ? 'KF' : 'KS';
  if (stats.KF.total !== stats.KS.total) return stats.KF.total < stats.KS.total ? 'KF' : 'KS';
  return Math.random() < 0.5 ? 'KF' : 'KS';
}

// Inserts with the next number for `code`, computed inside the same statement
// so concurrent registrations cannot collide. Returns the row, or null when
// the person was already registered (the UNIQUE(name_key, age) conflict).
async function insertRegistrant(db, person, code) {
  const result = await db.execute({
    sql: `INSERT INTO youth_registrants
            (tag, code, seq, full_name, name_key, age, gender, age_grade, group_name, created_at)
          SELECT ? || '-' || printf('%03d', n), ?, n, ?, ?, ?, ?, ?, ?, ?
          FROM (SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM youth_registrants WHERE code = ?)
          WHERE 1
          ON CONFLICT (name_key, age) DO NOTHING
          RETURNING *`,
    args: [
      code, code, person.name, nameKey(person.name), person.age, person.gender,
      gradeFor(person.age), GROUPS[code], new Date().toISOString(), code,
    ],
  });
  return result.rows[0] || null;
}

// Returns the badge record: the existing one if this person already
// registered, otherwise a new one in `code` (or a balanced group when null).
async function register(db, person, code) {
  const existing = await findRegistrant(db, person);
  if (existing) return toPublic(existing, true);
  const row = await insertRegistrant(db, person, code || await chooseGroup(db, person));
  if (row) return toPublic(row, false);
  // Lost a race with an identical registration — return that one.
  return toPublic(await findRegistrant(db, person), true);
}

async function lookup(db, person) {
  const row = await findRegistrant(db, person);
  return row ? toPublic(row, true) : null;
}

async function listRegistrants(db) {
  const result = await db.execute('SELECT * FROM youth_registrants ORDER BY code, seq');
  return result.rows.map((r) => toPublic(r, false));
}

// --- Lockout: 10 wrong secrets of one kind in 10 minutes blocks that kind ---

const MAX_FAILURES = 10;
const WINDOW = '-10 minutes';

async function isLockedOut(db, kind) {
  const result = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM youth_auth_failures
          WHERE kind = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)`,
    args: [kind, WINDOW],
  });
  return Number(result.rows[0].n) >= MAX_FAILURES;
}

async function recordFailure(db, kind) {
  await db.execute({
    sql: 'INSERT INTO youth_auth_failures (kind, created_at) VALUES (?, ?)',
    args: [kind, new Date().toISOString()],
  });
  await db.execute("DELETE FROM youth_auth_failures WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')");
}

module.exports = {
  GROUPS, GRADES, ensureSchema, cleanPerson, gradeFor,
  register, lookup, listRegistrants, isLockedOut, recordFailure,
};
