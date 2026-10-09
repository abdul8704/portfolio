// SQLite via Node's built-in driver: no native build step, one file on disk.
import { createRequire } from 'node:module';
import path from 'node:path';
import { DATA_DIR } from './config.js';

const require = createRequire(import.meta.url);

function open() {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(DATA_DIR, 'portfolio.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 4000;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT    NOT NULL,
      slug        TEXT    NOT NULL,
      position    REAL    NOT NULL DEFAULT 0,
      published   INTEGER NOT NULL DEFAULT 1,
      data        TEXT    NOT NULL,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL,
      deleted_at  INTEGER,
      UNIQUE (type, slug)
    );
    CREATE INDEX IF NOT EXISTS items_type_pos ON items (type, position);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      width      INTEGER NOT NULL,
      height     INTEGER NOT NULL,
      bytes      INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,   -- sha256 of the cookie token
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      last_seen  INTEGER NOT NULL,
      ip         TEXT,
      agent      TEXT
    );
  `);
  return db;
}

// Reuse one connection across dev-server module reloads.
export const db = (globalThis.__portfolioDb ??= open());
