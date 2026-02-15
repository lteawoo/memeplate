import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env.js';

const ACCESS_COOKIE_NAME = 'mp_access';

type AccessClaims = JwtPayload & {
  sub: string;
  email?: string | null;
  displayName?: string | null;
};

const parseCookieHeader = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return {};
  }
  const pairs = cookieHeader.split(';');
  const parsed: Record<string, string> = {};

  for (const pair of pairs) {
    const [rawKey, ...rawValueParts] = pair.trim().split('=');
    if (!rawKey) {
      continue;
    }
    parsed[rawKey] = decodeURIComponent(rawValueParts.join('=') ?? '');
  }

  return parsed;
};

const getAccessSecret = () => {
  const accessSecret = env.JWT_ACCESS_SECRET ?? env.AUTH_SESSION_SECRET;
  if (!accessSecret) {
    throw new Error('JWT access secret is missing.');
  }
  return accessSecret;
};

const verifyAccessToken = (token: string, accessSecret: string): AccessClaims | null => {
  try {
    const decoded = jwt.verify(token, accessSecret);
    if (!decoded || typeof decoded === 'string') {
      return null;
    }
    if (typeof decoded.sub !== 'string') {
      return null;
    }
    return decoded as AccessClaims;
  } catch {
    return null;
  }
};

export const resolveAuthUser = (request: FastifyRequest) => {
  const cookies = parseCookieHeader(request.headers.cookie);
  const accessToken = cookies[ACCESS_COOKIE_NAME];
  if (!accessToken) {
    return null;
  }

  const claims = verifyAccessToken(accessToken, getAccessSecret());
  if (!claims) {
    return null;
  }

  return {
    id: claims.sub,
    email: claims.email ?? null,
    displayName: claims.displayName ?? null
  };
};

export const requireAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const authUser = resolveAuthUser(request);

  if (!authUser) {
    return reply.code(401).send({ message: 'Authentication required.' });
  }

  request.authUser = authUser;
};
