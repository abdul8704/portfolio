// Redis for caching, rate limits and visitor de-duplication. Connection from REDIS_URL.
// Without REDIS_URL (e.g. quick local runs) an in-process stand-in is used, which works
// for a single server but is not shared between instances and empties on restart.
// Redis errors never break a page: reads fall through to Postgres, limits fail open.
import { createClient } from 'redis';
import { REDIS_URL, REDIS_PREFIX } from './config.js';

const P = REDIS_PREFIX;

function memoryStore() {
  const m = new Map(); // key -> { v, exp }
  const live = (k) => {
    const e = m.get(k);
    if (e && e.exp && e.exp < Date.now()) { m.delete(k); return undefined; }
    return e;
  };
  return {
    kind: 'memory',
    async get(k) { return live(k)?.v ?? null; },
    async set(k, v, { EX, NX } = {}) {
      if (NX && live(k)) return null;
      if (m.size > 50_000) m.clear();
      m.set(k, { v: String(v), exp: EX ? Date.now() + EX * 1000 : 0 });
      return 'OK';
    },
    async incr(k) { const e = live(k); const n = Number(e?.v ?? 0) + 1; m.set(k, { v: String(n), exp: e?.exp ?? 0 }); return n; },
    async expire(k, s) { const e = live(k); if (e) e.exp = Date.now() + s * 1000; return 1; },
    async ttl(k) { const e = live(k); return !e ? -2 : e.exp ? Math.ceil((e.exp - Date.now()) / 1000) : -1; },
    async del(k) { return m.delete(k) ? 1 : 0; },
  };
}

function redisStore() {
  const c = createClient({ url: REDIS_URL, socket: { reconnectStrategy: (n) => Math.min(n * 200, 5000) } });
  c.on('error', (e) => { if (!c.__warned) { console.error('redis:', e.message); c.__warned = true; } });
  c.on('ready', () => { c.__warned = false; });
  c.kind = 'redis';
  c.connect().catch(() => {});
  return c;
}

const store = (globalThis.__portfolioCache ??= REDIS_URL ? redisStore() : memoryStore());
export const cacheKind = store.kind;
const up = () => store.kind === 'memory' || store.isReady;

async function safe(fn, fallback) {
  if (!up()) return fallback;
  try { return await fn(); } catch (e) { console.error('redis:', e.message); return fallback; }
}

export const cacheGet = (key) => safe(async () => {
  const v = await store.get(P + key);
  return v == null ? undefined : JSON.parse(v);
}, undefined);

export const cacheSet = (key, value, ttlSec) => safe(() => store.set(P + key, JSON.stringify(value), { EX: ttlSec }), null);
export const cacheDel = (key) => safe(() => store.del(P + key), 0);

/** Return the cached value for key, or compute it with fn() and cache it for ttlSec. */
export async function cached(key, ttlSec, fn) {
  const hit = await cacheGet(key);
  if (hit !== undefined) return hit;
  const val = await fn();
  await cacheSet(key, val, ttlSec);
  return val;
}

/** Count an event in a fixed window. Returns the new count (0 if Redis is down). */
export const bump = (key, windowSec) => safe(async () => {
  const n = await store.incr(P + key);
  if (n === 1) await store.expire(P + key, windowSec);
  return n;
}, 0);
export const peek = (key) => safe(async () => Number((await store.get(P + key)) ?? 0), 0);
export const ttl = (key) => safe(() => store.ttl(P + key), -2);

/** Store value only if key is empty; returns whatever the key holds afterwards (undefined if Redis is down). */
export const setIfAbsent = (key, value, ttlSec) => safe(async () => {
  await store.set(P + key, JSON.stringify(value), { NX: true, EX: ttlSec });
  const v = await store.get(P + key);
  return v == null ? undefined : JSON.parse(v);
}, undefined);

/** True the first time a key is claimed within ttlSec (fails open as "first"). */
export const firstTime = (key, ttlSec) => safe(async () => (await store.set(P + key, '1', { NX: true, EX: ttlSec })) === 'OK', true);

/* ---- public content cache ----
   Published pages read profile and items through contentCache(). Any admin edit calls
   bumpContent(), which moves every key to a new version, so visitors never see stale data. */
const CONTENT_TTL = 600;
let localVer = 0;
async function contentVersion() {
  const v = await safe(() => store.get(P + 'content:ver'), null);
  return v ?? String(localVer);
}
export async function contentCache(key, fn) {
  const ver = await contentVersion();
  return cached(`content:${ver}:${key}`, CONTENT_TTL, fn);
}
export async function bumpContent() {
  localVer++;
  await safe(() => store.incr(P + 'content:ver'), null);
}

/** For scripts: wait for Redis (a few seconds at most), or close it when done. */
export async function cacheReady(ms = 3000) {
  for (const end = Date.now() + ms; store.kind === 'redis' && !store.isReady && Date.now() < end; ) await new Promise((r) => setTimeout(r, 50));
}
export async function closeCache() {
  if (store.kind === 'redis' && store.isOpen) await store.quit().catch(() => {});
}
