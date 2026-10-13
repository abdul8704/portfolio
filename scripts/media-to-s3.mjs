#!/usr/bin/env node
// Copies images already in DATA_DIR/uploads to the S3 bucket in .env.
// Run once after setting S3_BUCKET. Local files are left in place as a backup.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR, S3 } from '../src/lib/config.js';
import { putBlob } from '../src/lib/blobs.js';

if (!S3.bucket) {
  console.error('Set S3_BUCKET (and AWS_REGION) in .env first.');
  process.exit(1);
}
const files = readdirSync(UPLOAD_DIR).filter((f) => /^[a-f0-9]{16}(-sm)?\.webp$/.test(f));
let n = 0;
for (const f of files) {
  await putBlob(f, readFileSync(path.join(UPLOAD_DIR, f)));
  n++;
}
console.log(`Copied ${n} file${n === 1 ? '' : 's'} to s3://${S3.bucket}/${S3.prefix}`);
