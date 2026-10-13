import { randomBytes } from 'node:crypto';
import { q as rawQ, one as rawOne, tx } from './db.js';
import { contentCache, bumpContent } from './cache.js';
import { ENTITIES, slugify } from './entities.js';
import { PROFILE_DEFAULTS, SEED } from './seed.js';
import { removeBlob } from './blobs.js';

const now = () => Date.now();

// First-run content and trash cleanup happen once, before any other query from this module.
const init = (globalThis.__portfolioInit ??= (async () => {
  await seed();
  await rawQ('DELETE FROM items WHERE deleted_at IS NOT NULL AND deleted_at < $1', [now() - 30 * 864e5]);
})());
init.catch((e) => console.error('startup:', e.message));
const q = async (sql, params) => { await init; return rawQ(sql, params); };
const one = async (sql, params) => { await init; return rawOne(sql, params); };

/* ------------------------------ settings ------------------------------ */
export async function getSetting(key, fallback = null) {
  const row = await one('SELECT value FROM settings WHERE key = $1', [key]);
  return row ? row.value : fallback;
}
export async function setSetting(key, value) {
  await q('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = excluded.value', [key, JSON.stringify(value)]);
  if (key === 'profile') await bumpContent();
}
export async function getProfile() {
  const saved = await contentCache('profile', () => getSetting('profile'));
  return { ...PROFILE_DEFAULTS, ...(saved || {}) };
}
export const saveProfile = (data) => setSetting('profile', data);

/* ------------------------------- items -------------------------------- */
function hydrate(r) {
  return {
    ...r.data,
    id: r.id,
    slug: r.slug,
    position: r.position,
    published: r.published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

async function queryItems(type, drafts, trash) {
  const cfg = ENTITIES[type];
  const where = trash ? 'deleted_at IS NOT NULL' : `deleted_at IS NULL${drafts ? '' : ' AND published'}`;
  const order = cfg.sortByDate ? "data->>'date' DESC NULLS LAST, created_at DESC" : 'position ASC, id ASC';
  return (await q(`SELECT * FROM items WHERE type = $1 AND ${where} ORDER BY ${order}`, [type])).map(hydrate);
}

/** Items of a type. What visitors see (published only) is served from the Redis cache. */
export function listItems(type, { drafts = false, trash = false } = {}) {
  if (!drafts && !trash) return contentCache(`items:${type}`, () => queryItems(type, false, false));
  return queryItems(type, drafts, trash);
}

export async function getItem(type, id) {
  if (!/^\d+$/.test(String(id))) return null;
  const r = await one('SELECT * FROM items WHERE type = $1 AND id = $2', [type, Number(id)]);
  return r ? hydrate(r) : null;
}

export async function getBySlug(type, slug, { drafts = false } = {}) {
  const load = async () => {
    const r = await one(`SELECT * FROM items WHERE type = $1 AND slug = $2 AND deleted_at IS NULL${drafts ? '' : ' AND published'}`, [type, slug]);
    return r ? hydrate(r) : null;
  };
  return drafts ? load() : contentCache(`slug:${type}:${slug}`, load);
}

async function uniqueSlug(c, type, base, exceptId = 0) {
  let slug = base;
  for (let n = 2; await c.one('SELECT id FROM items WHERE type = $1 AND slug = $2 AND id <> $3', [type, slug, exceptId]); n++) slug = `${base}-${n}`;
  return slug;
}

export async function saveItem(type, id, { data, published, slug }) {
  await init;
  const cfg = ENTITIES[type];
  const title = data[cfg.titleField] || 'untitled';
  const out = await tx(async (c) => {
    if (id) {
      const cur = await c.one('SELECT * FROM items WHERE type = $1 AND id = $2 FOR UPDATE', [type, Number(id)]);
      if (!cur) throw new Error('Item not found');
      const finalSlug = await uniqueSlug(c, type, slugify(slug || cur.slug), cur.id);
      await c.q('UPDATE items SET slug = $1, published = $2, data = $3, updated_at = $4 WHERE id = $5',
        [finalSlug, !!published, JSON.stringify(data), now(), cur.id]);
      return cur.id;
    }
    const min = (await c.one('SELECT MIN(position) AS m FROM items WHERE type = $1', [type])).m ?? 1;
    const finalSlug = await uniqueSlug(c, type, slugify(slug || title));
    const r = await c.one('INSERT INTO items (type, slug, position, published, data, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [type, finalSlug, min - 1, !!published, JSON.stringify(data), now(), now()]);
    return r.id;
  });
  await bumpContent();
  return out;
}

const write = async (sql, params) => { await q(sql, params); await bumpContent(); };
export const trashItem = (id) => write('UPDATE items SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL', [now(), Number(id)]);
export const restoreItem = (id) => write('UPDATE items SET deleted_at = NULL WHERE id = $1', [Number(id)]);
export const purgeItem = (id) => write('DELETE FROM items WHERE id = $1 AND deleted_at IS NOT NULL', [Number(id)]);
export const purgeOldTrash = (days = 30) => write('DELETE FROM items WHERE deleted_at IS NOT NULL AND deleted_at < $1', [now() - days * 864e5]);

export async function moveItem(type, id, dir) {
  await init;
  await tx(async (c) => {
    const ids = (await c.q('SELECT id FROM items WHERE type = $1 AND deleted_at IS NULL ORDER BY position ASC, id ASC FOR UPDATE', [type])).map((r) => r.id);
    const i = ids.indexOf(Number(id));
    const j = dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await c.q('UPDATE items SET position = x.pos FROM unnest($1::bigint[]) WITH ORDINALITY AS x(id, pos) WHERE items.id = x.id', [ids]);
  });
  await bumpContent();
}

export async function duplicateItem(type, id) {
  const src = await getItem(type, id);
  if (!src) return null;
  const cfg = ENTITIES[type];
  const data = {};
  for (const f of cfg.fields) data[f.key] = src[f.key];
  data[cfg.titleField] = `${data[cfg.titleField]} (copy)`;
  return saveItem(type, null, { data, published: false, slug: `${src.slug}-copy` });
}

export async function counts() {
  const rows = await q(`SELECT type,
      COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND NOT published) AS drafts,
      COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS trash
    FROM items GROUP BY type`);
  const out = {};
  for (const type of Object.keys(ENTITIES)) {
    const r = rows.find((x) => x.type === type);
    out[type] = { total: r?.total || 0, drafts: r?.drafts || 0, trash: r?.trash || 0 };
  }
  return out;
}

export async function recentItems(limit = 6) {
  return (await q('SELECT * FROM items WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT $1', [limit])).map((r) => ({ type: r.type, ...hydrate(r) }));
}

const strings = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
const PLACEHOLDER = /\[[^\]\n]{2,}\](?!\()/;
export async function findPlaceholders() {
  const found = [];
  for (const r of await q('SELECT * FROM items WHERE deleted_at IS NULL ORDER BY type, position')) {
    if (strings(r.data).some((v) => PLACEHOLDER.test(v))) {
      const it = hydrate(r);
      found.push({ type: r.type, id: r.id, title: it[ENTITIES[r.type].titleField] });
    }
  }
  return found;
}

/* ------------------------------- media -------------------------------- */
export const addMedia = (m) =>
  q('INSERT INTO media (id, name, width, height, bytes, created_at) VALUES ($1,$2,$3,$4,$5,$6)', [m.id, m.name, m.width, m.height, m.bytes, now()]);
export const listMedia = () => q('SELECT * FROM media ORDER BY created_at DESC');
export const getMedia = (id) => one('SELECT * FROM media WHERE id = $1', [id]);

export async function mediaUsage(id) {
  const needle = `%/media/${id}.webp%`;
  const hits = (await q('SELECT * FROM items WHERE data::text LIKE $1 AND deleted_at IS NULL', [needle])).map((r) => {
    const it = hydrate(r);
    return { type: r.type, id: r.id, title: it[ENTITIES[r.type].titleField] };
  });
  if (await one("SELECT 1 FROM settings WHERE key = 'profile' AND value::text LIKE $1", [needle])) {
    hits.push({ type: 'profile', id: 0, title: 'Site settings' });
  }
  return hits;
}

export async function deleteMedia(id) {
  if (!/^[a-f0-9]{16}$/.test(id)) return;
  await q('DELETE FROM media WHERE id = $1', [id]);
  return Promise.all([`${id}.webp`, `${id}-sm.webp`].map(removeBlob));
}
export const newMediaId = () => randomBytes(8).toString('hex');

/* -------------------------------- seed -------------------------------- */
async function seed() {
  // The 'seeded' row doubles as a lock, so two servers starting together seed only once.
  await tx(async (c) => {
    const claimed = await c.one("INSERT INTO settings (key, value) VALUES ('seeded', 'true') ON CONFLICT (key) DO NOTHING RETURNING key");
    if (!claimed) return;
    for (const [type, rows] of Object.entries(SEED)) {
      const cfg = ENTITIES[type];
      for (const [i, data] of rows.entries()) {
        const slug = await uniqueSlug(c, type, slugify(data[cfg.titleField]));
        await c.q('INSERT INTO items (type, slug, position, published, data, created_at, updated_at) VALUES ($1,$2,$3,TRUE,$4,$5,$5)',
          [type, slug, i + 1, JSON.stringify(data), now()]);
      }
    }
  });
}
