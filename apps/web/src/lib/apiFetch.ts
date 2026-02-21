import { redirectToLoginWithNext } from './loginNavigation';

const REFRESH_ENDPOINT = '/api/v1/auth/refresh';
const AUTH_ME_ENDPOINT = '/api/v1/auth/me';

type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

type AuthMeResponse = {
  authenticated: boolean;
  user?: AuthUser;
};

type ApiFetchOptions = {
  retryOnUnauthorized?: boolean;
  redirectOnAuthFailure?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

export const refreshAuthSession = async (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(REFRESH_ENDPOINT, {
          method: 'POST',
          credentials: 'include'
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
};

const toUrlString = (input: RequestInfo | URL) =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

export const apiFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: ApiFetchOptions
): Promise<Response> => {
  const retryOnUnauthorized = options?.retryOnUnauthorized ?? true;
  const redirectOnAuthFailure = options?.redirectOnAuthFailure ?? true;
  const requestInit: RequestInit = {
    credentials: 'include',
    ...init
  };

  const res = await fetch(input, requestInit);
  if (!retryOnUnauthorized || res.status !== 401) {
    if (res.status === 401 && redirectOnAuthFailure) {
      redirectToLoginWithNext();
    }
    return res;
  }

  const url = toUrlString(input);
  if (url.includes(REFRESH_ENDPOINT)) {
    return res;
  }

  const refreshed = await refreshAuthSession();
  if (!refreshed) {
    if (redirectOnAuthFailure) {
      redirectToLoginWithNext();
    }
    return res;
  }

  const retryRes = await fetch(input, requestInit);
  if (retryRes.status === 401 && redirectOnAuthFailure) {
    redirectToLoginWithNext();
  }
  return retryRes;
};

export const fetchAuthMeWithRefresh = async (): Promise<AuthMeResponse> => {
  const first = await fetch(AUTH_ME_ENDPOINT, { credentials: 'include' });
  if (!first.ok) {
    return { authenticated: false };
  }

  const firstPayload = (await first.json()) as AuthMeResponse;
  if (firstPayload.authenticated) {
    return firstPayload;
  }

  const refreshed = await refreshAuthSession();
  if (!refreshed) {
    return firstPayload;
  }

  const second = await fetch(AUTH_ME_ENDPOINT, { credentials: 'include' });
  if (!second.ok) {
    return { authenticated: false };
  }

  return (await second.json()) as AuthMeResponse;
};
