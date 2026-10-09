import { getProfile } from '../lib/store.js';
import { originOf, llmsFullTxt } from '../lib/seo.js';
export const prerender = false;
export function GET({ url }) {
  const profile = getProfile();
  if (!profile.indexable) return new Response('Not found', { status: 404 });
  return new Response(llmsFullTxt(originOf(url, profile), profile), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
