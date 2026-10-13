// Where uploaded image files live. With S3_BUCKET set they go to S3 (the bucket
// can stay private: the site streams them through /media). Without it they are
// plain files in DATA_DIR/uploads, which is what local development uses.
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR, S3 } from './config.js';

let _client;
async function s3() {
  if (_client) return _client;
  const sdk = await import('@aws-sdk/client-s3');
  _client = {
    sdk,
    // Credentials come from the usual AWS chain: the EC2 instance role, or
    // AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, or ~/.aws.
    client: new sdk.S3Client({
      region: S3.region,
      ...(S3.endpoint ? { endpoint: S3.endpoint, forcePathStyle: true } : {}),
    }),
  };
  return _client;
}
const key = (name) => S3.prefix + name;

export const usingS3 = () => !!S3.bucket;

export async function putBlob(name, body, contentType = 'image/webp') {
  if (!S3.bucket) return writeFile(path.join(UPLOAD_DIR, name), body);
  const { sdk, client } = await s3();
  await client.send(new sdk.PutObjectCommand({
    Bucket: S3.bucket, Key: key(name), Body: body, ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

/** The file's bytes, or null when it does not exist. */
export async function getBlob(name) {
  if (!S3.bucket) {
    try { return await readFile(path.join(UPLOAD_DIR, name)); } catch { return null; }
  }
  const { sdk, client } = await s3();
  try {
    const out = await client.send(new sdk.GetObjectCommand({ Bucket: S3.bucket, Key: key(name) }));
    return Buffer.from(await out.Body.transformToByteArray());
  } catch (e) {
    if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}

export async function removeBlob(name) {
  if (!S3.bucket) {
    try { await unlink(path.join(UPLOAD_DIR, name)); } catch { /* already gone */ }
    return;
  }
  const { sdk, client } = await s3();
  await client.send(new sdk.DeleteObjectCommand({ Bucket: S3.bucket, Key: key(name) }));
}
