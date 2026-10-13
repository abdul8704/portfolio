#!/usr/bin/env node
// One-time copy of the old SQLite database (data/portfolio.db) into Postgres (DATABASE_URL).
//   npm run sqlite-to-postgres             copies into an empty Postgres database
//   npm run sqlite-to-postgres -- --replace  wipes the content already in Postgres first
// Copies content, settings (including your admin password if you changed it in the app),
// the image list and analytics. Sign-in sessions are not copied, so you sign in again.
// The SQLite file is only read, never changed.
import path from 'node:path';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { DATA_DIR } from '../src/lib/config.js';
import { q, tx, pool } from '../src/lib/db.js';
import { bumpContent, cacheReady, closeCache } from '../src/lib/cache.js';

const replace = process.argv.includes('--replace');
const file = path.join(DATA_DIR, 'portfolio.db');
if (!existsSync(file)) {
  console.error(`No SQLite database at ${file}. Nothing to copy.`);
  process.exit(1);
}
const lite = new DatabaseSync(file, { readOnly: true });
const has = (t) => !!lite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
const all = (t) => (has(t) ? lite.prepare(`SELECT * FROM ${t}`).all() : []);

const items = all('items');
const settings = all('settings');
const media = all('media');
const hits = all('hits');

try {
  const [{ n }] = await q('SELECT COUNT(*) AS n FROM items');
  if (n > 0 && !replace) {
    console.error(`Postgres already has ${n} items (maybe the sample content from starting the site).`);
    console.error('Run again with --replace to wipe them and copy your SQLite data in:  npm run sqlite-to-postgres -- --replace');
    process.exitCode = 1;
  } else {
    await tx(async (c) => {
      if (replace) await c.q('TRUNCATE items, settings, media, hits RESTART IDENTITY');
      for (const r of items) {
        await c.q(`INSERT INTO items (id, type, slug, position, published, data, created_at, updated_at, deleted_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [r.id, r.type, r.slug, r.position, !!r.published, r.data, r.created_at, r.updated_at, r.deleted_at]);
      }
      await c.q("SELECT setval(pg_get_serial_sequence('items', 'id'), GREATEST((SELECT MAX(id) FROM items), 1))");
      for (const r of settings) {
        await c.q('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = excluded.value', [r.key, r.value]);
      }
      for (const r of media) {
        await c.q('INSERT INTO media (id, name, width, height, bytes, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING',
          [r.id, r.name, r.width, r.height, r.bytes, r.created_at]);
      }
      for (const r of hits) {
        await c.q(`INSERT INTO hits (day, kind, target, count, visitors) VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (day, kind, target) DO UPDATE SET count = excluded.count, visitors = excluded.visitors`,
          [r.day, r.kind, r.target, r.count, r.visitors]);
      }
    });
    await cacheReady();
    await bumpContent();
    console.log(`Copied ${items.length} items, ${settings.length} settings, ${media.length} images and ${hits.length} analytics rows into Postgres.`);
    console.log('Images themselves stay where they are (data/uploads or S3).');
  }
} catch (e) {
  console.error('Nothing was copied:', e.message);
  process.exitCode = 1;
} finally {
  lite.close();
  await pool.end();
  await closeCache();
}
