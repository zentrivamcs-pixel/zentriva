// Single database client for every runtime. Turso (libSQL over the network)
// when TURSO_DATABASE_URL is set — i.e. on Vercel — and a local SQLite file
// otherwise, so the Express dev server and the serverless functions run the
// exact same driver and queries.
const path = require('path');
const { createClient } = require('@libsql/client');

let client;

function getDb() {
  if (!client) {
    if (process.env.TURSO_DATABASE_URL) {
      client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    } else {
      // Local dev file, next to the old better-sqlite3 location so existing
      // dev data carries over. file: URLs need forward slashes on Windows.
      const file = path.join(__dirname, '..', 'server', 'data.sqlite').replace(/\\/g, '/');
      client = createClient({ url: `file:${file}` });
    }
  }
  return client;
}

module.exports = { getDb };
