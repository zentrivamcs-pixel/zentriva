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

  // UNIQUE(code, seq) backs the tag numbering so a tag can never be handed out
  // twice. The "already registered" rule is the unique index on name_key
  // created below; UNIQUE(name_key, age) is the older, looser form of it.
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

  // A name identifies exactly one registrant, whatever age is typed with it.
  // Rows written before this rule used a looser key (case + spacing only), so
  // bring them onto the current one first. A row whose new key collides with
  // another row's is left as it is — register() still refuses new clashes.
  const rows = await db.execute('SELECT id, full_name, name_key FROM youth_registrants');
  for (const row of rows.rows) {
    // Names are stored in capitals (see cleanPerson); done here rather than
    // with SQL upper(), which only knows A–Z.
    const upper = String(row.full_name).toUpperCase();
    if (upper !== row.full_name) {
      await db.execute({ sql: 'UPDATE youth_registrants SET full_name = ? WHERE id = ?', args: [upper, row.id] });
    }
    const key = nameKey(row.full_name);
    if (key === row.name_key) continue;
    try {
      await db.execute({ sql: 'UPDATE youth_registrants SET name_key = ? WHERE id = ?', args: [key, row.id] });
    } catch (err) {
      console.warn(`Could not re-key youth registrant ${row.id} (duplicate name?):`, err.message);
    }
  }
  // Guarded like the members email index: a table that already holds two
  // people under one name keeps working, with register()'s own check in force.
  try {
    await db.execute(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_youth_registrants_name ON youth_registrants(name_key)'
    );
  } catch (err) {
    console.warn('Could not create unique youth name index (duplicate names in data?):', err.message);
  }

  schemaReady = true;
}

function gradeFor(age) {
  const g = GRADES.find(([, lo, hi]) => age >= lo && age <= hi);
  return g ? g[0] : GRADES[3][0];
}

// What makes two typed names "the same name": case, accents, spacing,
// punctuation and word order are all ignored, so "Adaeze  Okafor",
// "okafor adaeze" and "Adaézé O'kafor"/"Adaeze Okafor" cannot each get a badge.
function nameKey(name) {
  return String(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
}

const NAME_MAX = 80;
const AGE_MIN = 1;
const AGE_MAX = 120;
// Letters (any script) with apostrophes, hyphens and dots inside a word. This
// also rules out a leading = + - @, which Excel/Sheets would read as a formula
// in an exported list.
const NAME_PART_RE = /^\p{L}[\p{L}\p{M}'’.-]*$/u;

// Returns { value } or { error } — the error text is shown to the registrant.
function cleanPerson(body) {
  const source = body && typeof body === 'object' ? body : {};
  if (typeof source.name !== 'string') return { error: 'Please enter your full name (first and last).' };
  // Every name is stored, listed and printed on the badge in capital letters.
  const name = source.name.normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();
  const parts = name ? name.split(' ') : [];
  if (name.length > NAME_MAX) return { error: `Please shorten your name to ${NAME_MAX} characters or fewer.` };
  if (!parts.every((part) => NAME_PART_RE.test(part))) {
    return { error: 'Please use letters only in your name (no numbers or symbols).' };
  }
  // Two real words, so "A B" or a single name with an initial is not enough.
  const words = parts.filter((part) => (part.match(/\p{L}/gu) || []).length >= 2);
  if (words.length < 2) return { error: 'Please enter your full name (first and last).' };

  // Whole numbers only: parseInt alone would accept "12abc" and "9.5".
  const rawAge = typeof source.age === 'number' ? String(source.age) : source.age;
  const age = typeof rawAge === 'string' && /^\d{1,3}$/.test(rawAge.trim()) ? Number(rawAge.trim()) : NaN;
  if (!(age >= AGE_MIN && age <= AGE_MAX)) return { error: 'Please enter a valid age.' };

  if (!GENDERS.includes(source.gender)) return { error: 'Please choose a gender.' };
  return { value: { name, age, gender: source.gender } };
}

// Thrown when a name is already registered under a different age, so the
// route can answer 409 with a message the registrant can act on.
class NameTakenError extends Error {
  constructor(fullName) {
    super(
      `"${fullName}" is already registered. If that is you, enter the age you registered with to see your badge. `
      + 'If you are a different person, add your middle name so your name is different.'
    );
    this.name = 'NameTakenError';
    this.code = 'NAME_TAKEN';
  }
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

// The registrant holding this name, or null. Same name + same age is the
// person coming back for their badge; same name + another age is refused,
// otherwise retyping your age would be a way to spin the wheel again.
async function findRegistrant(db, person) {
  const result = await db.execute({
    sql: `SELECT * FROM youth_registrants WHERE name_key = ?
          ORDER BY (age = ?) DESC, id LIMIT 1`,
    args: [nameKey(person.name), person.age],
  });
  const row = result.rows[0] || null;
  if (row && Number(row.age) !== person.age) throw new NameTakenError(row.full_name);
  return row;
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
// the name was already registered (the unique name_key conflict).
async function insertRegistrant(db, person, code) {
  const result = await db.execute({
    sql: `INSERT INTO youth_registrants
            (tag, code, seq, full_name, name_key, age, gender, age_grade, group_name, created_at)
          SELECT ? || '-' || printf('%03d', n), ?, n, ?, ?, ?, ?, ?, ?, ?
          FROM (SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM youth_registrants WHERE code = ?)
          WHERE 1
          ON CONFLICT DO NOTHING
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
  // Lost a race with a registration under the same name — return that one
  // (findRegistrant throws NameTakenError if it was for a different age).
  const winner = await findRegistrant(db, person);
  if (!winner) throw new Error('Youth registration insert was skipped without a matching name');
  return toPublic(winner, true);
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
  GROUPS, GRADES, ensureSchema, cleanPerson, gradeFor, nameKey, NameTakenError,
  register, lookup, listRegistrants, isLockedOut, recordFailure,
};
