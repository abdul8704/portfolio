// Privacy-friendly visit counting: daily totals only, no cookies, no raw IPs.
// A visitor is counted once per day per page/link using a hash of IP + browser + a salt
// that changes every day and is never stored, so visits can't be linked across days.
// Totals live in Postgres (table hits). The daily salt and the "already counted today"
// markers live in Redis and expire on their own after two days.
import { createHash, randomBytes } from 'node:crypto';
import { q, one } from './db.js';
import { firstTime, setIfAbsent } from './cache.js';
import { getBySlug } from './store.js';
import { ENTITIES } from './entities.js';

export const KINDS = ['view', 'resume', 'out', 'ref'];
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|uptime|curl|wget|python|java\/|go-http|node-fetch|axios|facebookexternalhit|embedly|whatsapp|telegram/i;

export const isBot = (ua) => !ua || BOT_RE.test(ua);
// Days roll over at midnight in your time zone (ANALYTICS_TZ in .env, default India).
export const TZ = process.env.ANALYTICS_TZ || 'Asia/Kolkata';
const fmtDay = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const today = () => fmtDay.format(new Date());

const TWO_DAYS = 2 * 86400;
const localSalt = (globalThis.__hitSalt ??= { day: '', value: '' });
async function dailySalt(day) {
  // shared by every server through Redis; the first one to need it picks it
  const fresh = randomBytes(16).toString('hex');
  const shared = await setIfAbsent(`hit-salt:${day}`, fresh, TWO_DAYS);
  if (shared) return shared;
  if (localSalt.day !== day) Object.assign(localSalt, { day, value: fresh }); // Redis unavailable
  return localSalt.value;
}

const upsert = (day, kind, target, isNew) => q(`
  INSERT INTO hits (day, kind, target, count, visitors) VALUES ($1, $2, $3, 1, $4)
  ON CONFLICT (day, kind, target) DO UPDATE SET count = hits.count + 1, visitors = hits.visitors + excluded.visitors`,
  [day, kind, target, isNew ? 1 : 0]);

/** Count one event. `who` is ip + user agent; it is hashed with today's salt and thrown away. */
export async function record(kind, target, who) {
  const day = today();
  const s = await dailySalt(day);
  const first = (k, t) => {
    const key = createHash('sha256').update(`${s}|${who}|${k}|${t}`).digest('base64url').slice(0, 22);
    return firstTime(`hit-seen:${day}:${key}`, TWO_DAYS);
  };
  await upsert(day, kind, target, await first(kind, target));
  // one "visit" row per day: total page views and unique visitors across the whole site
  if (kind === 'view') await upsert(day, 'visit', '', await first('visit', ''));
}

/** Only real pages are counted, so random paths posted to the endpoint don't pollute the stats. */
export async function pageExists(path) {
  if (path === '/' || path === '/blog') return true;
  const m = /^\/([a-z]+)\/([a-z0-9-]{1,80})$/.exec(path);
  if (!m) return false;
  const type = Object.keys(ENTITIES).find((t) => ENTITIES[t].detail && ENTITIES[t].base === `/${m[1]}`);
  if (!type) return false;
  return !!(await getBySlug(type, m[2])); // published only, served from the cache
}

/* ---------- reading, for the admin ---------- */

const dayStr = (d) => d.toISOString().slice(0, 10);
export function range(days) {
  const end = new Date(today() + 'T00:00:00Z');
  const start = new Date(end); start.setUTCDate(end.getUTCDate() - (days - 1));
  const prevStart = new Date(start); prevStart.setUTCDate(start.getUTCDate() - days);
  const prevEnd = new Date(start); prevEnd.setUTCDate(start.getUTCDate() - 1);
  return { from: dayStr(start), to: dayStr(end), prevFrom: dayStr(prevStart), prevTo: dayStr(prevEnd) };
}

/** Daily series, with empty days filled in. field is 'count' or 'visitors'. */
export async function series({ kind, target, field = 'count', from, to }) {
  const rows = await q(`SELECT day, SUM(${field === 'visitors' ? 'visitors' : 'count'}) AS n FROM hits
    WHERE kind = $1 AND ($2::text IS NULL OR target = $2) AND day BETWEEN $3 AND $4 GROUP BY day`,
    [kind, target ?? null, from, to]);
  const by = new Map(rows.map((r) => [r.day, Number(r.n)]));
  const out = [];
  for (let d = new Date(from + 'T00:00:00Z'); dayStr(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push({ day: dayStr(d), n: by.get(dayStr(d)) ?? 0 });
  }
  return out;
}

export async function total({ kind, field = 'count', from, to }) {
  const r = await one(`SELECT COALESCE(SUM(${field === 'visitors' ? 'visitors' : 'count'}), 0) AS n FROM hits WHERE kind = $1 AND day BETWEEN $2 AND $3`, [kind, from, to]);
  return Number(r.n);
}

/** Top targets for one kind: [{ target, count, visitors }] */
export async function top({ kind, from, to, limit = 50 }) {
  return (await q(`SELECT target, SUM(count) AS count, SUM(visitors) AS visitors FROM hits
    WHERE kind = $1 AND day BETWEEN $2 AND $3 GROUP BY target ORDER BY 2 DESC, target LIMIT $4`,
    [kind, from, to, limit])).map((r) => ({ target: r.target, count: Number(r.count), visitors: Number(r.visitors) }));
}

export const hasAnyHits = async () => !!(await one('SELECT 1 FROM hits LIMIT 1'));
