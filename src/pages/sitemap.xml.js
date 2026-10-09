import { listItems, getProfile } from '../lib/store.js';
import { ENTITIES } from '../lib/entities.js';
import { originOf, abs } from '../lib/seo.js';
export const prerender = false;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function GET({ url }) {
  const profile = getProfile();
  if (!profile.indexable) return new Response('Not found', { status: 404 });
  const origin = originOf(url, profile);
  const entries = [{ loc: origin + '/', priority: '1.0' }, { loc: origin + '/blog', priority: '0.8' }];
  for (const type of ['project', 'achievement', 'certification', 'post']) {
    for (const it of listItems(type)) {
      entries.push({
        loc: `${origin}${ENTITIES[type].base}/${it.slug}`,
        lastmod: new Date(it.updatedAt).toISOString().slice(0, 10),
        priority: type === 'post' ? '0.7' : '0.6',
        image: it.image ? abs(origin, it.image) : '',
      });
    }
  }
  const body = entries.map((e) =>
    `  <url>\n    <loc>${esc(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}\n    <priority>${e.priority}</priority>${e.image ? `\n    <image:image><image:loc>${esc(e.image)}</image:loc></image:image>` : ''}\n  </url>`).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`,
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } },
  );
}
