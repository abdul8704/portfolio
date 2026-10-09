// AlgoMentor problem-solving stats, fetched on the server so visitors never
// spend the API's per-IP rate limit. Results are cached in memory; if the API
// is down we keep showing the last good copy, and with nothing cached the
// section simply doesn't render.

export const ALGOMENTOR_URL = (process.env.ALGOMENTOR_URL || 'https://algomentor.abdul-aziz.dev').replace(/\/+$/, '');
const TTL_MS = 15 * 60 * 1000; // the API itself refreshes every 3 h; 15 min is plenty
const RETRY_MS = 60 * 1000; // after a failure, don't hammer the API
const TIMEOUT_MS = 2500;

const PLATFORM_LABELS = { leetcode: 'LeetCode', codeforces: 'Codeforces', atcoder: 'AtCoder', cses: 'CSES' };
const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);

const cache = new Map(); // key -> { at, ok, value }

/** Shape the `stats` widget into what the section draws. Tolerates missing fields. */
export function shapeStats(stats) {
  const t = stats?.totals || {};
  const platforms = (Array.isArray(stats?.platforms) ? stats.platforms : [])
    .map((p) => {
      const easy = num(p.easy), medium = num(p.medium), hard = num(p.hard);
      const solved = Math.max(num(p.solved), easy + medium + hard);
      const rating = num(p.rating), maxRating = num(p.maxRating);
      return {
        key: String(p.platform || ''),
        label: PLATFORM_LABELS[p.platform] || String(p.platform || 'Other'),
        solved, easy, medium, hard,
        other: solved - easy - medium - hard,
        rating: rating || null,
        maxRating: maxRating || null,
      };
    })
    .filter((p) => p.solved > 0)
    .sort((a, b) => b.solved - a.solved);

  const easy = num(t.easy), medium = num(t.medium), hard = num(t.hard);
  const solved = Math.max(num(t.solved), easy + medium + hard, platforms.reduce((a, p) => a + p.solved, 0));
  if (!solved) return null;
  return { solved, easy, medium, hard, other: solved - easy - medium - hard, platforms, maxPlatform: platforms[0]?.solved || 1 };
}

/** Stats for a public handle, or null when the profile/widget isn't public or the API can't be reached. */
export async function getSolvedStats(handle, base = ALGOMENTOR_URL) {
  handle = String(handle || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(handle)) return null;
  const url = `${base.replace(/\/+$/, '')}/api/public/v1/users/${encodeURIComponent(handle)}/stats`;
  const hit = cache.get(url);
  const now = Date.now();
  if (hit && now - hit.at < (hit.ok ? TTL_MS : RETRY_MS)) return hit.value;

  try {
    const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 404) {
      // turned off, renamed, or the stats widget is hidden: stop showing it
      cache.set(url, { at: now, ok: true, value: null });
      return null;
    }
    if (!res.ok) throw new Error(`AlgoMentor API ${res.status}`);
    const body = await res.json();
    const value = shapeStats(body?.data);
    if (value) value.fetchedAt = body?.meta?.servedAt || new Date().toISOString();
    cache.set(url, { at: now, ok: true, value });
    return value;
  } catch (err) {
    console.warn('[algomentor]', err?.message || err);
    // keep the last good copy if there is one
    const value = hit?.value ?? null;
    cache.set(url, { at: now, ok: false, value });
    return value;
  }
}
