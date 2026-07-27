// Data layer for inbound support email — the receiving side of Resend
// (members are in shared/membersRepo.js, which this mirrors: one schema,
// one set of queries, shared by the Express dev server and Vercel
// functions). Resend's email.received webhook only carries metadata; the
// full message is fetched separately and stored here so the admin inbox
// can list/read history without calling Resend on every view.

let schemaReady = false;

async function ensureSchema(db) {
  if (schemaReady) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS inbound_messages (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      resend_id     TEXT UNIQUE,
      from_address  TEXT,
      to_address    TEXT,
      subject       TEXT,
      text_body     TEXT,
      html_body     TEXT,
      attachments   TEXT,
      received_at   TEXT,
      is_read       INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(
    'CREATE INDEX IF NOT EXISTS idx_inbound_messages_created ON inbound_messages(created_at DESC)'
  );

  schemaReady = true;
}

function deserialize(row) {
  const out = { ...row };
  try {
    out.attachments = row.attachments ? JSON.parse(row.attachments) : [];
  } catch {
    out.attachments = [];
  }
  out.is_read = !!row.is_read;
  if (typeof out.id === 'bigint') out.id = Number(out.id);
  return out;
}

// Idempotent on resend_id — Svix (and therefore Resend) retries webhook
// deliveries, so the same email.received event can arrive more than once.
//
// The conflict path fills in blanks rather than doing nothing: when the
// webhook lands but fetching the full message fails, a metadata-only row is
// stored so the message is at least visible in the admin Inbox, and the
// retry that does carry the body updates that row in place. COALESCE keeps
// whichever version had content, so a retry can never blank out a message
// that was already stored in full.
async function createInboundMessage(db, msg) {
  await db.execute({
    sql: `INSERT INTO inbound_messages
          (resend_id, from_address, to_address, subject, text_body, html_body, attachments, received_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(resend_id) DO UPDATE SET
            from_address = COALESCE(excluded.from_address, from_address),
            to_address   = COALESCE(excluded.to_address, to_address),
            subject      = COALESCE(excluded.subject, subject),
            text_body    = COALESCE(excluded.text_body, text_body),
            html_body    = COALESCE(excluded.html_body, html_body),
            attachments  = COALESCE(excluded.attachments, attachments)`,
    args: [
      msg.resendId,
      msg.from ? String(Array.isArray(msg.from) ? msg.from.join(', ') : msg.from) : null,
      msg.to ? String(Array.isArray(msg.to) ? msg.to.join(', ') : msg.to) : null,
      msg.subject || null,
      msg.text || null, msg.html || null,
      msg.attachments && msg.attachments.length ? JSON.stringify(msg.attachments) : null,
      msg.receivedAt || new Date().toISOString(),
    ],
  });
}

async function listInboundMessages(db) {
  const result = await db.execute('SELECT * FROM inbound_messages ORDER BY created_at DESC');
  return result.rows.map(deserialize);
}

async function setInboundMessageRead(db, id, isRead) {
  await db.execute({
    sql: 'UPDATE inbound_messages SET is_read = ? WHERE id = ?',
    args: [isRead ? 1 : 0, id],
  });
}

module.exports = {
  ensureSchema, createInboundMessage, listInboundMessages, setInboundMessageRead,
};
