import { listItems, getProfile } from '../lib/store.js';
import { originOf } from '../lib/seo.js';
import { renderMarkdown } from '../lib/markdown.js';
export const prerender = false;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET({ url }) {
  const profile = getProfile();
  const origin = originOf(url, profile);
  const posts = listItems('post');
  const items = [];
  for (const p of posts.slice(0, 30)) {
    const { html } = await renderMarkdown(p.body);
    const link = `${origin}/blog/${p.slug}`;
    items.push(`<item><title>${esc(p.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${new Date(p.date + 'T00:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description><content:encoded><![CDATA[${html.replace(/]]>/g, ']]]]><![CDATA[>')}]]></content:encoded></item>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(profile.name)}'s blog</title><link>${origin}/blog</link><description>${esc(profile.summary)}</description><language>en</language><atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml"/>${items.join('')}</channel></rss>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
