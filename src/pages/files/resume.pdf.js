// Serves the uploaded résumé PDF: inline for the popup viewer, or as a download with ?download=1.
import { getProfile } from '../../lib/store.js';
import { getBlob } from '../../lib/blobs.js';

export const prerender = false;

export async function GET({ url, request }) {
  const profile = await getProfile();
  const key = profile.resumeFile;
  if (!key || !/^resume-[a-f0-9]{16}\.pdf$/.test(key)) return new Response('Not found', { status: 404 });
  const etag = `"${key}"`;
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag } });
  let buf;
  try {
    buf = await getBlob(key);
  } catch (e) {
    console.error('[resume]', e?.message || e);
    return new Response('Résumé storage unavailable', { status: 502 });
  }
  if (!buf) return new Response('Not found', { status: 404 });
  const base = String(profile.name || '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'Resume';
  const filename = base.toLowerCase().includes('resume') ? `${base}.pdf` : `${base}-Resume.pdf`;
  return new Response(buf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `${url.searchParams.has('download') ? 'attachment' : 'inline'}; filename="${filename}"`,
      'cache-control': 'public, max-age=300, must-revalidate',
      etag,
    },
  });
}
