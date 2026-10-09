// Runtime configuration. Secrets come from the environment (.env), never from code.
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

try {
  process.loadEnvFile('.env'); // does not override variables that are already set
} catch {
  /* no .env file: fine, rely on real environment variables */
}

export const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

export const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
export const SESSION_DAYS = 7;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Cookie signing secret: SESSION_SECRET from env, else generated once and kept in the data dir.
let _secret;
export function sessionSecret() {
  if (_secret) return _secret;
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 24) {
    return (_secret = process.env.SESSION_SECRET);
  }
  const file = path.join(DATA_DIR, '.secret');
  if (existsSync(file)) return (_secret = readFileSync(file, 'utf8').trim());
  _secret = randomBytes(32).toString('hex');
  writeFileSync(file, _secret, { mode: 0o600 });
  return _secret;
}
