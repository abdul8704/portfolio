import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
export const prerender = false;

// iOS home-screen icon, rendered from the favicon so there is one source of truth.
let cached;
export async function GET() {
  if (!cached) {
    const svg = await readFile(new URL('../../public/favicon.svg', import.meta.url)).catch(() => readFile('public/favicon.svg'));
    cached = await sharp(svg, { density: 600 }).resize(180, 180).png().toBuffer();
  }
  return new Response(cached, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
}
