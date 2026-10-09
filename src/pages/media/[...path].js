import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR } from '../../lib/config.js';

export const prerender = false;

export async function GET({ params, request }) {
  const name = params.path || '';
  if (!/^[a-f0-9]{16}(-sm)?\.webp$/.test(name)) return new Response('Not found', { status: 404 });
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, name));
    const etag = `"${buf.length}-${name}"`;
    if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304 });
    return new Response(buf, {
      headers: { 'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable', etag },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
