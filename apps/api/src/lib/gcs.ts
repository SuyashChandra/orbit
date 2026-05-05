import { Storage } from '@google-cloud/storage';
import { env } from './env.js';

const storage = new Storage({ projectId: env.GCP_PROJECT_ID });
const bucket = storage.bucket(env.GCS_BUCKET);

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const file = bucket.file(key);
  await file.save(buffer, { contentType, resumable: false });
}

export async function deleteFile(key: string): Promise<void> {
  await bucket.file(key).delete({ ignoreNotFound: true });
}

export async function getSignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
  const [url] = await bucket.file(key).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInSeconds * 1000,
  });
  return url;
}
