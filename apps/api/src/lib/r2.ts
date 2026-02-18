import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

const getAllowedMimeSet = () =>
  new Set(
    (env.R2_UPLOAD_ALLOWED_MIME ?? 'image/png,image/jpeg,image/webp')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data URL format.');
  }
  return {
    mimeType: match[1].toLowerCase(),
    base64Payload: match[2]
  };
};

const resolveExt = (mimeType: string) => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'bin';
};

const assertR2Config = () => {
  if (!env.R2_BUCKET_NAME || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ENDPOINT) {
    throw new Error('R2 env is missing. Fill R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT.');
  }
};

const buildPublicUrl = (key: string) => {
  if (!env.R2_PUBLIC_BASE_URL) return null;
  const base = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '');
  return `${base}/${key}`;
};

type UploadFolder = 'template-backgrounds' | 'meme-images';

const resolveFolderPath = (folder: UploadFolder) => {
  if (folder === 'template-backgrounds') return 'templates';
  return 'meme-images';
};

const uploadImageDataUrl = async (ownerId: string, dataUrl: string, folder: UploadFolder) => {
  assertR2Config();
  const allowedMime = getAllowedMimeSet();
  const maxMb = env.R2_UPLOAD_MAX_MB ?? 10;
  const maxBytes = maxMb * 1024 * 1024;

  const { mimeType, base64Payload } = parseDataUrl(dataUrl);
  if (!allowedMime.has(mimeType)) {
    throw new Error(`Unsupported image mime type: ${mimeType}`);
  }

  const body = Buffer.from(base64Payload, 'base64');
  if (body.byteLength > maxBytes) {
    throw new Error(`Image size exceeds max upload limit (${maxMb}MB).`);
  }

  const ext = resolveExt(mimeType);
  const folderPath = resolveFolderPath(folder);
  const key = `${folderPath}/${ownerId}/${Date.now()}-${randomUUID()}.${ext}`;

  const client = new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT,
    forcePathStyle: false,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!
    }
  });

  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );

  const publicUrl = buildPublicUrl(key);
  if (!publicUrl) {
    throw new Error('R2 upload succeeded but R2_PUBLIC_BASE_URL is missing.');
  }
  return publicUrl;
};

export const uploadTemplateBackgroundDataUrl = async (ownerId: string, dataUrl: string) => {
  return uploadImageDataUrl(ownerId, dataUrl, 'template-backgrounds');
};

export const uploadMemeImageDataUrl = async (ownerId: string, dataUrl: string) =>
  uploadImageDataUrl(ownerId, dataUrl, 'meme-images');
