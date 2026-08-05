// Data layer for "Learn a Skill" applications — the training-programme side
// of the registration page (src/register). Mirrors shared/membersRepo.js: one
// schema, one set of queries, shared by the Express dev server and the Vercel
// functions.
//
// These are deliberately NOT members: an applicant asks to be trained, pays
// no registration fee, and gets no portal account. They become a member only
// by registering through the membership form.

const APPLICATION_STATUSES = ['new', 'contacted', 'enrolled', 'closed'];

let schemaReady = false;

async function ensureSchema(db) {
  if (schemaReady) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS skill_applications (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name    TEXT NOT NULL,
      gender       TEXT,
      age          INTEGER,
      phone_number TEXT,
      email        TEXT,
      skill        TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'new',
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(
    'CREATE INDEX IF NOT EXISTS idx_skill_applications_created ON skill_applications(created_at DESC)'
  );

  schemaReady = true;
}

function deserialize(row) {
  const out = { ...row };
  if (typeof out.id === 'bigint') out.id = Number(out.id);
  if (typeof out.age === 'bigint') out.age = Number(out.age);
  return out;
}

// One person may only have one open application per skill — a double-tap on
// the submit button (or a retry after a flaky response) must not produce two
// rows. Returns { created, application }: `created` is false when a matching
// application from the last 24 hours already exists.
async function createSkillApplication(db, value) {
  const existing = await db.execute({
    sql: `SELECT * FROM skill_applications
          WHERE phone_number = ? AND skill = ? AND created_at > datetime('now', '-1 day')
          LIMIT 1`,
    args: [value.phone_number, value.skill],
  });
  if (existing.rows[0]) {
    return { created: false, application: deserialize(existing.rows[0]) };
  }

  const result = await db.execute({
    sql: `INSERT INTO skill_applications (full_name, gender, age, phone_number, email, skill, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      value.full_name, value.gender || null, value.age || null,
      value.phone_number, value.email || null, value.skill,
      new Date().toISOString(),
    ],
  });
  const created = await db.execute({
    sql: 'SELECT * FROM skill_applications WHERE id = ?',
    args: [Number(result.lastInsertRowid)],
  });
  return { created: true, application: deserialize(created.rows[0]) };
}

async function listSkillApplications(db) {
  const result = await db.execute(
    'SELECT * FROM skill_applications ORDER BY created_at DESC, id DESC'
  );
  return result.rows.map(deserialize);
}

// Admin follow-up state ("contacted", "enrolled", …). Returns the updated
// row, or null when the id is unknown.
async function setSkillApplicationStatus(db, id, status) {
  if (!APPLICATION_STATUSES.includes(status)) {
    throw new Error(`status must be one of: ${APPLICATION_STATUSES.join(', ')}`);
  }
  const result = await db.execute({
    sql: 'UPDATE skill_applications SET status = ? WHERE id = ? RETURNING *',
    args: [status, id],
  });
  return result.rows[0] ? deserialize(result.rows[0]) : null;
}

async function deleteSkillApplication(db, id) {
  const result = await db.execute({
    sql: 'DELETE FROM skill_applications WHERE id = ?',
    args: [id],
  });
  return result.rowsAffected > 0;
}

module.exports = {
  APPLICATION_STATUSES, ensureSchema, createSkillApplication,
  listSkillApplications, setSkillApplicationStatus, deleteSkillApplication,
};
