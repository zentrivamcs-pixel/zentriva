// Single database client for every runtime. Turso (libSQL over the network)
// when TURSO_DATABASE_URL is set — i.e. on Vercel — and a local SQLite file
// otherwise, so the Express dev server and the serverless functions run the
// exact same driver and queries.
const path = require('path');
const { createClient } = require('@libsql/client');

let client;

// Thrown when a hosted deployment has no Turso credentials. Previously the
// file: fallback below was used in that case, which cannot work on Vercel —
// the function filesystem is read-only and server/data.sqlite is gitignored,
// so it never ships. The result was a misleading generic 500 on every
// database-backed route, indistinguishable from a real outage. Fail here
// instead, naming the missing variable.
class DatabaseConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseConfigError';
    this.code = 'DB_NOT_CONFIGURED';
  }
}

// Vercel and Lambda both set these; neither is set for `npm run server`.
function isHostedRuntime() {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function getDb() {
  if (!client) {
    if (process.env.TURSO_DATABASE_URL) {
      client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    } else if (isHostedRuntime()) {
      throw new DatabaseConfigError(
        'TURSO_DATABASE_URL is not set. A hosted deployment cannot fall back to '
        + 'the local SQLite file (read-only filesystem, and server/data.sqlite is '
        + 'not deployed). Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the '
        + 'Vercel project settings, then redeploy — environment variable changes '
        + 'only reach existing deployments after a rebuild.'
      );
    } else {
      // Local dev file, next to the old better-sqlite3 location so existing
      // dev data carries over. file: URLs need forward slashes on Windows.
      const file = path.join(__dirname, '..', 'server', 'data.sqlite').replace(/\\/g, '/');
      client = createClient({ url: `file:${file}` });
    }
  }
  return client;
}

// True when an error means "the database could not be reached", as opposed to
// a bug in a query or in application code. Callers map this to 503 rather than
// 500 so an outage reads as an outage.
//
// The libSQL client reports these inconsistently — sometimes a `code`,
// sometimes only wrapped in the message (a Turso 502 arrives as
// `SERVER_ERROR: Server returned HTTP status 502`) — so both are checked.
// Turso's own 4xx responses are deliberately excluded: a rejected auth token
// is a configuration fault that will not heal on its own, and reporting it as
// a temporary outage would send whoever is on call looking in the wrong place.
const UNAVAILABLE_CODES = new Set([
  'DB_NOT_CONFIGURED', 'SERVER_ERROR', 'UNAVAILABLE', 'WEBSOCKET_ERROR',
  'HRANA_WEBSOCKET_ERROR', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN',
  'ETIMEDOUT', 'ECONNRESET', 'UND_ERR_CONNECT_TIMEOUT',
]);

const UNAVAILABLE_MESSAGE = /ConnectionFailed|connect to upstream|Server returned HTTP status 5\d\d|unable to open database|fetch failed|socket hang up|network error/i;

function isDatabaseUnavailable(err) {
  if (!err) return false;
  if (UNAVAILABLE_CODES.has(err.code)) {
    // SERVER_ERROR covers every non-2xx from Turso; only 5xx is an outage.
    if (err.code === 'SERVER_ERROR') return /HTTP status 5\d\d/.test(String(err.message));
    return true;
  }
  return UNAVAILABLE_MESSAGE.test(String(err.message || ''));
}

module.exports = { getDb, isDatabaseUnavailable, DatabaseConfigError };
