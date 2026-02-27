import type { FastifyReply } from 'fastify';

const normalizeExtension = (value: string) => {
  const cleaned = value.trim().toLowerCase();
  if (!cleaned) return null;
  const normalized = cleaned === 'jpeg' ? 'jpg' : cleaned === 'svg+xml' ? 'svg' : cleaned.split('+')[0] ?? '';
  if (!/^[a-z0-9]{1,10}$/.test(normalized)) return null;
  return normalized;
};

const extensionFromMime = (mimeType?: string | null) => {
  if (!mimeType) return null;
  const subtype = mimeType.split(';')[0]?.trim().split('/')[1] ?? '';
  return normalizeExtension(subtype);
};

const extensionFromUrl = (url: string) => {
  let pathname = '';
  try {
    pathname = new URL(url).pathname;
  } catch {
    const withoutHash = url.split('#')[0] ?? '';
    pathname = withoutHash.split('?')[0] ?? '';
  }

  const filename = pathname.split('/').pop()?.trim() ?? '';
  if (!filename || !filename.includes('.')) return null;
  const ext = filename.split('.').pop() ?? '';
  return normalizeExtension(ext);
};

const sanitizeFileBaseName = (value: string, fallback: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

export const replyWithAttachmentFromRemoteImage = async (
  reply: FastifyReply,
  params: {
    imageUrl: string;
    fileBaseName: string;
    fallbackBaseName?: string;
    mimeType?: string | null;
  }
) => {
  const { imageUrl, fileBaseName, fallbackBaseName = 'memeplate', mimeType } = params;

  let response: Response;
  try {
    response = await fetch(imageUrl);
  } catch {
    return reply.code(502).send({ message: '이미지 다운로드에 실패했습니다.' });
  }

  if (!response.ok) {
    return reply.code(502).send({ message: '이미지 다운로드에 실패했습니다.' });
  }

  const upstreamContentType = response.headers.get('content-type');
  const extension = extensionFromMime(upstreamContentType) ?? extensionFromMime(mimeType) ?? extensionFromUrl(imageUrl) ?? 'png';
  const filename = `${sanitizeFileBaseName(fileBaseName, fallbackBaseName)}.${extension}`;

  const arrayBuffer = await response.arrayBuffer();
  const body = Buffer.from(arrayBuffer);
  const contentType = upstreamContentType ?? mimeType ?? 'application/octet-stream';

  reply.header('Content-Type', contentType);
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  reply.header('Cache-Control', 'no-store');
  reply.header('Content-Length', String(body.byteLength));
  return reply.send(body);
};
