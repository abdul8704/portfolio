import { getBlob } from '../../lib/blobs.js';

export const prerender = false;

export async function GET({ params, request }) {
  const name = params.path || '';
  if (!/^[a-f0-9]{16}(-sm)?\.webp$/.test(name)) return new Response('Not found', { status: 404 });
  // File names never change once written, so the name itself is a good ETag.
  const etag = `"${name}"`;
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304 });
  let buf;
  try {
    buf = await getBlob(name);
  } catch (e) {
    console.error('[media]', e?.message || e);
    return new Response('Image storage unavailable', { status: 502 });
  }
  if (!buf) return new Response('Not found', { status: 404 });
  return new Response(buf, {
    headers: { 'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable', etag },
  });
}
