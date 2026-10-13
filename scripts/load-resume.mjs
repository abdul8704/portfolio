#!/usr/bin/env node
// Replaces the site content with scripts/resume-content.mjs.
// Safe to run while the site is running. A full backup of the database is made
// first, and the old entries go to the admin Trash (restorable for 30 days).
// Blog posts and your admin login are not touched.
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { DATA_DIR } from '../src/lib/config.js';
import { q, tx, pool } from '../src/lib/db.js';
import { bumpContent, cacheReady, closeCache } from '../src/lib/cache.js';
import { slugify } from '../src/lib/entities.js';
import { periodText } from '../src/lib/timeline.js';
import { PROFILE, ITEMS } from './resume-content.mjs';

mkdirSync(DATA_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const backup = path.join(DATA_DIR, `backup-${stamp}.json`);
writeFileSync(backup, JSON.stringify({ items: await q('SELECT * FROM items'), settings: await q("SELECT * FROM settings WHERE key <> 'admin'") }, null, 1));
console.log(`Backup saved: ${backup}`);

const now = Date.now();
const titleOf = { timeline: 'title', project: 'name', achievement: 'title', certification: 'name', skill: 'group' };

try {
  await tx(async (c) => {
    const uniqueSlug = async (type, base) => {
      let slug = base || 'item';
      for (let n = 2; await c.one('SELECT 1 FROM items WHERE type = $1 AND slug = $2', [type, slug]); n++) slug = `${base}-${n}`;
      return slug;
    };
    for (const [type, rows] of Object.entries(ITEMS)) {
      const trashed = (await c.q('UPDATE items SET deleted_at = $1 WHERE type = $2 AND deleted_at IS NULL RETURNING id', [now, type])).length;
      for (const [i, row] of rows.entries()) {
        const data = type === 'timeline' ? { ...row, period: periodText(row.start, row.end) } : row;
        const base = slugify(type === 'achievement' ? `${row.title} ${row.event}` : row[titleOf[type]]);
        await c.q('INSERT INTO items (type, slug, position, published, data, created_at, updated_at) VALUES ($1,$2,$3,TRUE,$4,$5,$5)',
          [type, await uniqueSlug(type, base), i + 1, JSON.stringify(data), now]);
      }
      console.log(`${type}: added ${rows.length}, moved ${trashed} old entr${trashed === 1 ? 'y' : 'ies'} to Trash`);
    }
    const cur = await c.one("SELECT value FROM settings WHERE key = 'profile'");
    await c.q("INSERT INTO settings (key, value) VALUES ('profile', $1) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
      [JSON.stringify({ ...(cur?.value || {}), ...PROFILE })]);
    await c.q("INSERT INTO settings (key, value) VALUES ('seeded', 'true') ON CONFLICT (key) DO NOTHING");
  });
  await cacheReady();
  await bumpContent(); // visitors see the new content right away
  console.log('Profile updated. Reload the site to see it.');
} catch (e) {
  console.error('Nothing was changed:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
  await closeCache();
}
