// PostgreSQL via node-postgres. Connection comes from DATABASE_URL in .env.
// Tables are created on first use, so a fresh empty database is all you need.
import pg from 'pg';
import { DATABASE_URL } from './config.js';

// BIGINT (our millisecond timestamps, counts) as plain numbers instead of strings.
pg.types.setTypeParser(20, (v) => Number(v));
// DATE as 'YYYY-MM-DD' text, not a JS Date shifted by the server's time zone.
pg.types.setTypeParser(1082, (v) => v);

const SCHEMA = `
  BEGIN;
  SELECT pg_advisory_xact_lock(724310); -- two servers starting at once create tables one at a time
  CREATE TABLE IF NOT EXISTS items (
    id          BIGSERIAL PRIMARY KEY,
    type        TEXT     NOT NULL,
    slug        TEXT     NOT NULL,
    position    DOUBLE PRECISION NOT NULL DEFAULT 0,
    published   BOOLEAN  NOT NULL DEFAULT TRUE,
    data        JSONB    NOT NULL,
    created_at  BIGINT   NOT NULL,
    updated_at  BIGINT   NOT NULL,
    deleted_at  BIGINT,
    UNIQUE (type, slug)
  );
  CREATE INDEX IF NOT EXISTS items_type_pos ON items (type, position);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value JSONB NOT NULL
  );

  CREATE TABLE IF NOT EXISTS media (
    id         TEXT PRIMARY KEY,
    name       TEXT    NOT NULL,
    width      INTEGER NOT NULL,
    height     INTEGER NOT NULL,
    bytes      INTEGER NOT NULL,
    created_at BIGINT  NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,   -- sha256 of the cookie token
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    last_seen  BIGINT NOT NULL,
    ip         TEXT,
    agent      TEXT
  );

  -- analytics: one row per day, kind and target; see analytics.js
  CREATE TABLE IF NOT EXISTS hits (
    day      DATE    NOT NULL,
    kind     TEXT    NOT NULL,
    target   TEXT    NOT NULL,
    count    INTEGER NOT NULL DEFAULT 0,
    visitors INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, kind, target)
  );
  COMMIT;
`;

function open() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add it to .env, e.g. DATABASE_URL=postgres://portfolio:secret@localhost:5432/portfolio');
  }
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: Number(process.env.PG_POOL_SIZE || 10) });
  pool.on('error', (e) => console.error('postgres:', e.message)); // idle client dropped; the pool reconnects
  const ready = pool.query(SCHEMA);
  ready.catch((e) => console.error('postgres: could not prepare tables:', e.message));
  return { pool, ready };
}

// Reuse one pool across dev-server module reloads.
const state = (globalThis.__portfolioPg ??= open());
export const pool = state.pool;

/** Run a query, return all rows. Use $1, $2… placeholders. */
export async function q(sql, params = []) {
  await state.ready;
  return (await pool.query(sql, params)).rows;
}
/** First row or null. */
export const one = async (sql, params) => (await q(sql, params))[0] ?? null;

/** Run fn(client) inside a transaction; client has the same q/one helpers. */
export async function tx(fn) {
  await state.ready;
  const c = await pool.connect();
  const api = {
    q: async (sql, params = []) => (await c.query(sql, params)).rows,
    one: async (sql, params = []) => (await c.query(sql, params)).rows[0] ?? null,
  };
  try {
    await c.query('BEGIN');
    const out = await fn(api);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
