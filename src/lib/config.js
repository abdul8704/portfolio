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

// Postgres holds all content, sessions and analytics. Redis holds caches and rate limits.
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const REDIS_URL = process.env.REDIS_URL || '';
export const REDIS_PREFIX = process.env.REDIS_PREFIX ?? 'portfolio:';

export const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
export const SESSION_DAYS = 7;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Image storage. Leave S3_BUCKET empty to keep images in DATA_DIR/uploads.
export const S3 = {
  bucket: (process.env.S3_BUCKET || '').trim(),
  region: process.env.AWS_REGION || process.env.S3_REGION || 'ap-south-1',
  prefix: (process.env.S3_PREFIX ?? 'portfolio/media/').replace(/^\/+/, ''),
  endpoint: process.env.S3_ENDPOINT || '', // only for S3-compatible stores (MinIO, R2)
};

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
