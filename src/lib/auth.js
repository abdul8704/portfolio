// Owner-only authentication: one account, scrypt password hash, server-side sessions.
import { scryptSync, randomBytes, timingSafeEqual, createHash, createHmac } from 'node:crypto';
import { q, one } from './db.js';
import { bump, peek, ttl, cacheDel } from './cache.js';
import { getSetting, setSetting } from './store.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PASSWORD_HASH, SESSION_DAYS, sessionSecret } from './config.js';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const DAY = 864e5;

/* ----------------------------- passwords ----------------------------- */
export function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}
export function verifyHash(pw, stored) {
  try {
    const [alg, s, h] = stored.split('$');
    if (alg !== 'scrypt') return false;
    const expected = Buffer.from(h, 'base64');
    const actual = scryptSync(pw, Buffer.from(s, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

let _envHash;
/** The active credentials: changed-in-app password wins, then env hash, then env plaintext. */
export async function credentials() {
  const stored = await getSetting('admin');
  if (stored?.hash) return { email: stored.email || ADMIN_EMAIL, hash: stored.hash };
  if (ADMIN_PASSWORD_HASH) return { email: ADMIN_EMAIL, hash: ADMIN_PASSWORD_HASH };
  if (ADMIN_PASSWORD) return { email: ADMIN_EMAIL, hash: (_envHash ??= hashPassword(ADMIN_PASSWORD)) };
  return null;
}
export const isConfigured = async () => !!(await credentials())?.email;

const DUMMY = hashPassword('not-the-password');
export async function checkLogin(email, password) {
  const c = await credentials();
  // Always run one scrypt so timing doesn't reveal whether the email matched.
  const okPw = verifyHash(String(password || ''), c?.hash || DUMMY);
  const okEmail = !!c && String(email || '').trim().toLowerCase() === c.email.toLowerCase();
  return !!c && okPw && okEmail;
}
export async function changePassword(newPassword) {
  const c = await credentials();
  await setSetting('admin', { email: c.email, hash: hashPassword(newPassword) });
}

/* --------------------------- rate limiting --------------------------- */
// Failed logins per IP, kept in Redis so the limit holds across restarts and servers.
const LIMIT = 5;
const WINDOW = 15 * 60; // seconds
const failKey = (ip) => `login-fail:${ip}`;
export async function lockedFor(ip) {
  if ((await peek(failKey(ip))) < LIMIT) return 0;
  return Math.max(1, Math.ceil((await ttl(failKey(ip))) / 60));
}
export const recordFailure = (ip) => bump(failKey(ip), WINDOW);
export const clearFailures = (ip) => cacheDel(failKey(ip));

/* ------------------------------ sessions ------------------------------ */
export async function createSession(ip, agent) {
  const token = randomBytes(32).toString('base64url');
  const t = Date.now();
  await q('DELETE FROM sessions WHERE expires_at < $1', [t]);
  await q('INSERT INTO sessions (id, created_at, expires_at, last_seen, ip, agent) VALUES ($1,$2,$3,$4,$5,$6)',
    [sha(token), t, t + SESSION_DAYS * DAY, t, ip, String(agent || '').slice(0, 200)]);
  return { token, maxAge: SESSION_DAYS * 86400 };
}
export async function getSession(token) {
  if (!token || token.length > 100) return null;
  const id = sha(token);
  const row = await one('SELECT * FROM sessions WHERE id = $1', [id]);
  if (!row || row.expires_at < Date.now()) return null;
  if (Date.now() - row.last_seen > 10 * 60 * 1000) {
    await q('UPDATE sessions SET last_seen = $1, expires_at = $2 WHERE id = $3', [Date.now(), Date.now() + SESSION_DAYS * DAY, id]);
  }
  return { id, createdAt: row.created_at, csrf: csrfFor(id) };
}
export const destroySession = (id) => q('DELETE FROM sessions WHERE id = $1', [id]);
export const destroyOthers = (keepId) => q('DELETE FROM sessions WHERE id <> $1', [keepId]);
export const destroyAll = () => q('DELETE FROM sessions');
export const listSessions = () => q('SELECT * FROM sessions WHERE expires_at > $1 ORDER BY last_seen DESC', [Date.now()]);

export function csrfFor(sessionId) {
  return createHmac('sha256', sessionSecret()).update('csrf:' + sessionId).digest('hex').slice(0, 40);
}
export function csrfValid(sessionId, token) {
  const a = Buffer.from(csrfFor(sessionId));
  const b = Buffer.from(String(token || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}
