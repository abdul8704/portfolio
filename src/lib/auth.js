// Owner-only authentication: one account, scrypt password hash, server-side sessions.
import { scryptSync, randomBytes, timingSafeEqual, createHash, createHmac } from 'node:crypto';
import { db } from './db.js';
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
export function credentials() {
  const stored = getSetting('admin');
  if (stored?.hash) return { email: stored.email || ADMIN_EMAIL, hash: stored.hash };
  if (ADMIN_PASSWORD_HASH) return { email: ADMIN_EMAIL, hash: ADMIN_PASSWORD_HASH };
  if (ADMIN_PASSWORD) return { email: ADMIN_EMAIL, hash: (_envHash ??= hashPassword(ADMIN_PASSWORD)) };
  return null;
}
export const isConfigured = () => !!credentials()?.email;

const DUMMY = hashPassword('not-the-password');
export function checkLogin(email, password) {
  const c = credentials();
  // Always run one scrypt so timing doesn't reveal whether the email matched.
  const okPw = verifyHash(String(password || ''), c?.hash || DUMMY);
  const okEmail = !!c && String(email || '').trim().toLowerCase() === c.email.toLowerCase();
  return !!c && okPw && okEmail;
}
export function changePassword(newPassword) {
  const c = credentials();
  setSetting('admin', { email: c.email, hash: hashPassword(newPassword) });
}

/* --------------------------- rate limiting --------------------------- */
const fails = new Map(); // ip -> { n, until }
const LIMIT = 5;
const WINDOW = 15 * 60 * 1000;
export function lockedFor(ip) {
  const f = fails.get(ip);
  if (!f) return 0;
  if (Date.now() > f.until) { fails.delete(ip); return 0; }
  return f.n >= LIMIT ? Math.ceil((f.until - Date.now()) / 60000) : 0;
}
export function recordFailure(ip) {
  const f = fails.get(ip);
  if (!f || Date.now() > f.until) fails.set(ip, { n: 1, until: Date.now() + WINDOW });
  else f.n++;
}
export const clearFailures = (ip) => fails.delete(ip);

/* ------------------------------ sessions ------------------------------ */
export function createSession(ip, agent) {
  const token = randomBytes(32).toString('base64url');
  const t = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(t);
  db.prepare('INSERT INTO sessions (id, created_at, expires_at, last_seen, ip, agent) VALUES (?,?,?,?,?,?)')
    .run(sha(token), t, t + SESSION_DAYS * DAY, t, ip, String(agent || '').slice(0, 200));
  return { token, maxAge: SESSION_DAYS * 86400 };
}
export function getSession(token) {
  if (!token || token.length > 100) return null;
  const id = sha(token);
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  if (!row || row.expires_at < Date.now()) return null;
  if (Date.now() - row.last_seen > 10 * 60 * 1000) {
    db.prepare('UPDATE sessions SET last_seen = ?, expires_at = ? WHERE id = ?').run(Date.now(), Date.now() + SESSION_DAYS * DAY, id);
  }
  return { id, createdAt: row.created_at, csrf: csrfFor(id) };
}
export const destroySession = (id) => db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
export const destroyOthers = (keepId) => db.prepare('DELETE FROM sessions WHERE id != ?').run(keepId);
export const destroyAll = () => db.prepare('DELETE FROM sessions').run();
export const listSessions = () => db.prepare('SELECT * FROM sessions WHERE expires_at > ? ORDER BY last_seen DESC').all(Date.now());

export function csrfFor(sessionId) {
  return createHmac('sha256', sessionSecret()).update('csrf:' + sessionId).digest('hex').slice(0, 40);
}
export function csrfValid(sessionId, token) {
  const a = Buffer.from(csrfFor(sessionId));
  const b = Buffer.from(String(token || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}
