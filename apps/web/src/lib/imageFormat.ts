const parseFormatTokenFromMime = (mimeType: string) => {
  const lower = mimeType.trim().toLowerCase();
  if (!lower) return null;
  const slashIndex = lower.lastIndexOf('/');
  const token = slashIndex >= 0 ? lower.slice(slashIndex + 1) : lower;
  if (!token) return null;
  return token.split(';')[0]?.trim() || null;
};

const parseFormatTokenFromUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return null;
  let pathname = '';
  try {
    pathname = new URL(trimmed).pathname;
  } catch {
    const withoutHash = trimmed.split('#')[0] ?? '';
    pathname = withoutHash.split('?')[0] ?? '';
  }

  const filename = pathname.split('/').pop()?.trim() ?? '';
  if (!filename || !filename.includes('.')) return null;

  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === filename.length - 1) return null;

  const ext = filename.slice(dotIndex + 1).trim().toLowerCase();
  if (!/^[a-z0-9.+-]{1,12}$/.test(ext)) return null;
  return ext;
};

const normalizeToken = (token: string) => {
  const withoutPlus = token.split('+')[0]?.trim().toLowerCase() ?? '';
  if (!withoutPlus) return null;
  if (withoutPlus === 'jpeg') return 'jpg';
  return withoutPlus;
};

export const formatImageFormatLabel = (mimeType?: string | null, fallbackUrl?: string | null) => {
  const mimeToken = typeof mimeType === 'string' ? parseFormatTokenFromMime(mimeType) : null;
  const normalizedMime = mimeToken ? normalizeToken(mimeToken) : null;
  if (normalizedMime) return normalizedMime.toUpperCase();

  const urlToken = typeof fallbackUrl === 'string' ? parseFormatTokenFromUrl(fallbackUrl) : null;
  const normalizedUrl = urlToken ? normalizeToken(urlToken) : null;
  if (normalizedUrl) return normalizedUrl.toUpperCase();

  return '-';
};
