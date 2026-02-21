type LocationLike = {
  pathname: string;
  search?: string;
  hash?: string;
};

const hasWindow = () => typeof window !== 'undefined';

const resolveOrigin = (origin?: string) => {
  if (origin) return origin;
  if (hasWindow()) return window.location.origin;
  return null;
};

export const getPathWithSearchAndHash = (locationLike?: LocationLike) => {
  if (locationLike) {
    const search = locationLike.search ?? '';
    const hash = locationLike.hash ?? '';
    return `${locationLike.pathname}${search}${hash}` || '/';
  }

  if (!hasWindow()) return '/';
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}` || '/';
};

export const sanitizeNextPath = (raw: string | null | undefined, origin?: string) => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  const baseOrigin = resolveOrigin(origin);
  if (!baseOrigin) {
    return trimmed;
  }

  try {
    const base = new URL(baseOrigin);
    const parsed = new URL(trimmed, base);
    if (parsed.origin !== base.origin) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

export const buildLoginPath = (nextPath?: string | null, origin?: string) => {
  const safeNextPath = sanitizeNextPath(nextPath, origin);
  if (!safeNextPath || safeNextPath === '/login') {
    return '/login';
  }
  return `/login?next=${encodeURIComponent(safeNextPath)}`;
};

export const redirectToLoginWithNext = (nextPath?: string | null) => {
  if (!hasWindow()) return;
  if (window.location.pathname === '/login') return;
  const fallbackNextPath = getPathWithSearchAndHash();
  window.location.href = buildLoginPath(nextPath ?? fallbackNextPath);
};
