import { getProfile } from '../lib/store.js';
import { originOf } from '../lib/seo.js';
export const prerender = false;

// Search and AI crawlers are welcome by name so the intent is unambiguous.
const BOTS = ['Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'CCBot', 'cohere-ai', 'Meta-ExternalAgent', 'Amazonbot', 'DuckDuckBot'];

export async function GET({ url }) {
  const profile = await getProfile();
  const origin = originOf(url, profile);
  const body = profile.indexable
    ? [
        ...BOTS.flatMap((b) => [`User-agent: ${b}`, 'Allow: /', 'Disallow: /admin/', '']),
        'User-agent: *', 'Allow: /', 'Disallow: /admin/', '',
        `Sitemap: ${origin}/sitemap.xml`, '',
      ].join('\n')
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
