import sharp from 'sharp';
import { MAX_UPLOAD_BYTES } from './config.js';
import { putBlob } from './blobs.js';
import { addMedia, newMediaId } from './store.js';

const OK = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff']);

/** Validate, re-encode and store an uploaded image. SVG is refused on purpose (script risk). */
export async function saveUpload(file) {
  if (!file || typeof file === 'string' || !file.size) throw new Error('Choose an image to upload.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That image is over 8 MB. Resize it and try again.');
  const input = Buffer.from(await file.arrayBuffer());
  let meta;
  try {
    meta = await sharp(input, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new Error('That file is not an image we can read. Use JPG, PNG, WebP, GIF or AVIF.');
  }
  if (!OK.has(meta.format)) throw new Error('Use JPG, PNG, WebP, GIF or AVIF.');

  const id = newMediaId();
  const base = sharp(input, { limitInputPixels: 60_000_000 }).rotate(); // also strips EXIF
  const full = await base.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const small = await base.clone().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
  await Promise.all([putBlob(`${id}.webp`, full.data), putBlob(`${id}-sm.webp`, small)]);
  const name = String(file.name || 'image').replace(/[^\w.\- ]+/g, '').slice(0, 80) || 'image';
  await addMedia({ id, name, width: full.info.width, height: full.info.height, bytes: full.data.length });
  return { id, url: `/media/${id}.webp`, width: full.info.width, height: full.info.height, name };
}
