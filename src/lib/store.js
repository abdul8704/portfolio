import { unlinkSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { db } from './db.js';
import { UPLOAD_DIR } from './config.js';
import { ENTITIES, slugify } from './entities.js';
import { PROFILE_DEFAULTS, SEED } from './seed.js';

const now = () => Date.now();

function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/* ------------------------------ settings ------------------------------ */
export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : fallback;
}
export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value));
}
export function getProfile() {
  return { ...PROFILE_DEFAULTS, ...(getSetting('profile') || {}) };
}
export function saveProfile(data) {
  setSetting('profile', data);
}

/* ------------------------------- items -------------------------------- */
function hydrate(r) {
  return {
    ...JSON.parse(r.data),
    id: r.id,
    slug: r.slug,
    position: r.position,
    published: !!r.published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

export function listItems(type, { drafts = false, trash = false } = {}) {
  const cfg = ENTITIES[type];
  const where = trash ? 'deleted_at IS NOT NULL' : `deleted_at IS NULL${drafts ? '' : ' AND published = 1'}`;
  const order = cfg.sortByDate
    ? "json_extract(data, '$.date') DESC, created_at DESC"
    : 'position ASC, id ASC';
  return db.prepare(`SELECT * FROM items WHERE type = ? AND ${where} ORDER BY ${order}`).all(type).map(hydrate);
}

export function getItem(type, id) {
  const r = db.prepare('SELECT * FROM items WHERE type = ? AND id = ?').get(type, Number(id));
  return r ? hydrate(r) : null;
}

export function getBySlug(type, slug, { drafts = false } = {}) {
  const r = db.prepare(`SELECT * FROM items WHERE type = ? AND slug = ? AND deleted_at IS NULL${drafts ? '' : ' AND published = 1'}`).get(type, slug);
  return r ? hydrate(r) : null;
}

function uniqueSlug(type, base, exceptId = 0) {
  let slug = base;
  let n = 2;
  const q = db.prepare('SELECT id FROM items WHERE type = ? AND slug = ? AND id != ?');
  while (q.get(type, slug, exceptId)) slug = `${base}-${n++}`;
  return slug;
}

export function saveItem(type, id, { data, published, slug }) {
  const cfg = ENTITIES[type];
  const title = data[cfg.titleField] || 'untitled';
  return tx(() => {
    if (id) {
      const cur = db.prepare('SELECT * FROM items WHERE type = ? AND id = ?').get(type, Number(id));
      if (!cur) throw new Error('Item not found');
      const finalSlug = uniqueSlug(type, slugify(slug || cur.slug), cur.id);
      db.prepare('UPDATE items SET slug = ?, published = ?, data = ?, updated_at = ? WHERE id = ?')
        .run(finalSlug, published ? 1 : 0, JSON.stringify(data), now(), cur.id);
      return cur.id;
    }
    const min = db.prepare('SELECT MIN(position) AS m FROM items WHERE type = ?').get(type).m ?? 1;
    const finalSlug = uniqueSlug(type, slugify(slug || title));
    const info = db.prepare('INSERT INTO items (type, slug, position, published, data, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run(type, finalSlug, min - 1, published ? 1 : 0, JSON.stringify(data), now(), now());
    return Number(info.lastInsertRowid);
  });
}

export const trashItem = (id) => db.prepare('UPDATE items SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL').run(now(), Number(id));
export const restoreItem = (id) => db.prepare('UPDATE items SET deleted_at = NULL WHERE id = ?').run(Number(id));
export const purgeItem = (id) => db.prepare('DELETE FROM items WHERE id = ? AND deleted_at IS NOT NULL').run(Number(id));
export function purgeOldTrash(days = 30) {
  db.prepare('DELETE FROM items WHERE deleted_at IS NOT NULL AND deleted_at < ?').run(now() - days * 864e5);
}

export function moveItem(type, id, dir) {
  tx(() => {
    const ids = db.prepare('SELECT id FROM items WHERE type = ? AND deleted_at IS NULL ORDER BY position ASC, id ASC').all(type).map((r) => r.id);
    const i = ids.indexOf(Number(id));
    const j = dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const up = db.prepare('UPDATE items SET position = ? WHERE id = ?');
    ids.forEach((x, k) => up.run(k + 1, x));
  });
}

export function duplicateItem(type, id) {
  const src = getItem(type, id);
  if (!src) return null;
  const cfg = ENTITIES[type];
  const data = {};
  for (const f of cfg.fields) data[f.key] = src[f.key];
  data[cfg.titleField] = `${data[cfg.titleField]} (copy)`;
  return saveItem(type, null, { data, published: false, slug: `${src.slug}-copy` });
}

export function counts() {
  const out = {};
  for (const type of Object.keys(ENTITIES)) {
    const r = db.prepare(`SELECT
        SUM(deleted_at IS NULL) AS total,
        SUM(deleted_at IS NULL AND published = 0) AS drafts,
        SUM(deleted_at IS NOT NULL) AS trash
      FROM items WHERE type = ?`).get(type);
    out[type] = { total: r.total || 0, drafts: r.drafts || 0, trash: r.trash || 0 };
  }
  return out;
}

export function recentItems(limit = 6) {
  return db.prepare('SELECT * FROM items WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT ?').all(limit).map((r) => ({ type: r.type, ...hydrate(r) }));
}

const PLACEHOLDER = /\[[^\]\n]{2,}\](?!\()/;
export function findPlaceholders() {
  const found = [];
  for (const r of db.prepare('SELECT * FROM items WHERE deleted_at IS NULL').all()) {
    if (PLACEHOLDER.test(r.data)) {
      const it = hydrate(r);
      found.push({ type: r.type, id: r.id, title: it[ENTITIES[r.type].titleField] });
    }
  }
  return found;
}

/* ------------------------------- media -------------------------------- */
export const addMedia = (m) =>
  db.prepare('INSERT INTO media (id, name, width, height, bytes, created_at) VALUES (?,?,?,?,?,?)').run(m.id, m.name, m.width, m.height, m.bytes, now());
export const listMedia = () => db.prepare('SELECT * FROM media ORDER BY created_at DESC').all();
export const getMedia = (id) => db.prepare('SELECT * FROM media WHERE id = ?').get(id);

export function mediaUsage(id) {
  const needle = `%/media/${id}.webp%`;
  const hits = [];
  for (const r of db.prepare('SELECT * FROM items WHERE data LIKE ? AND deleted_at IS NULL').all(needle)) {
    const it = hydrate(r);
    hits.push({ type: r.type, id: r.id, title: it[ENTITIES[r.type].titleField] });
  }
  if (db.prepare("SELECT 1 FROM settings WHERE key = 'profile' AND value LIKE ?").get(needle)) {
    hits.push({ type: 'profile', id: 0, title: 'Site settings' });
  }
  return hits;
}

export function deleteMedia(id) {
  if (!/^[a-f0-9]{16}$/.test(id)) return;
  db.prepare('DELETE FROM media WHERE id = ?').run(id);
  for (const f of [`${id}.webp`, `${id}-sm.webp`]) {
    try { unlinkSync(path.join(UPLOAD_DIR, f)); } catch { /* already gone */ }
  }
}
export const newMediaId = () => randomBytes(8).toString('hex');

/* -------------------------------- seed -------------------------------- */
function seed() {
  if (getSetting('seeded')) return;
  tx(() => {
    for (const [type, rows] of Object.entries(SEED)) {
      const cfg = ENTITIES[type];
      rows.forEach((data, i) => {
        const slug = uniqueSlug(type, slugify(data[cfg.titleField]));
        db.prepare('INSERT INTO items (type, slug, position, published, data, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
          .run(type, slug, i + 1, 1, JSON.stringify(data), now(), now());
      });
    }
    setSetting('seeded', true);
  });
}
seed();
purgeOldTrash();
