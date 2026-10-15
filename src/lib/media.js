import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { MAX_UPLOAD_BYTES, MAX_PDF_BYTES } from './config.js';
import { putBlob } from './blobs.js';
import { addMedia, newMediaId } from './store.js';

const OK = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff']);
const MAX_PIXELS = 80_000_000;
const mb = (n) => (n / 1048576).toFixed(n >= 10485760 ? 0 : 1).replace(/\.0$/, '');

/** Validate, re-encode and store an uploaded image. SVG is refused on purpose (script risk). */
export async function saveUpload(file) {
  if (!file || typeof file === 'string' || !file.size) throw new Error('Choose an image to upload.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`That image is ${mb(file.size)} MB, over the ${mb(MAX_UPLOAD_BYTES)} MB limit. Choose a smaller one or resize it first.`);
  const input = Buffer.from(await file.arrayBuffer());
  let meta;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch (e) {
    if (/pixel limit/i.test(e?.message || '')) throw new Error(`That image has too many pixels (over ${MAX_PIXELS / 1e6} megapixels). Resize it and try again.`);
    throw new Error('That file is not an image we can read. Use JPG, PNG, WebP, GIF or AVIF.');
  }
  if (!OK.has(meta.format)) throw new Error('Use JPG, PNG, WebP, GIF or AVIF.');
  if ((meta.width || 0) * (meta.height || 0) > MAX_PIXELS) throw new Error(`That image has too many pixels (over ${MAX_PIXELS / 1e6} megapixels). Resize it and try again.`);

  const id = newMediaId();
  const base = sharp(input, { limitInputPixels: MAX_PIXELS }).rotate(); // also strips EXIF
  const full = await base.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const small = await base.clone().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
  await Promise.all([putBlob(`${id}.webp`, full.data), putBlob(`${id}-sm.webp`, small)]);
  const name = String(file.name || 'image').replace(/[^\w.\- ]+/g, '').slice(0, 80) || 'image';
  await addMedia({ id, name, width: full.info.width, height: full.info.height, bytes: full.data.length });
  return { id, url: `/media/${id}.webp`, width: full.info.width, height: full.info.height, name };
}

/** Store an uploaded résumé PDF. Returns the storage key that goes in the profile (resumeFile). */
export async function saveResume(file) {
  if (!file || typeof file === 'string' || !file.size) throw new Error('Choose a PDF to upload.');
  if (file.size > MAX_PDF_BYTES) throw new Error(`That PDF is ${mb(file.size)} MB, over the ${mb(MAX_PDF_BYTES)} MB limit. Compress it and try again.`);
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('That file is not a PDF. Export your résumé as a PDF and upload that.');
  const key = `resume-${randomBytes(8).toString('hex')}.pdf`;
  await putBlob(key, buf, 'application/pdf');
  return { key, bytes: buf.length };
}
