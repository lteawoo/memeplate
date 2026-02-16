import { createHash, randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { getSupabaseAdminClient } from '../../lib/supabaseAdmin.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const ACCESS_COOKIE_NAME = 'mp_access';
const REFRESH_COOKIE_NAME = 'mp_refresh';
const OAUTH_STATE_COOKIE_NAME = 'mp_oauth_state';

type GoogleTokenResponse = {
  access_token: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  name?: string;
};

type UserRecord = {
  id: string;
  email: string | null;
  display_name: string | null;
};

type SessionRecord = {
  id: string;
  user_id: string;
  expires_at: string;
};

type AccessClaims = JwtPayload & {
  sub: string;
  email?: string | null;
  displayName?: string | null;
};

type RefreshClaims = JwtPayload & {
  sub: string;
  typ: 'refresh';
  jti: string;
};

type JwtConfig = {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSec: number;
  refreshTtlSec: number;
};

const UpdateMeSchema = z.object({
  displayName: z.string().trim().min(1).max(60)
});

const toCookieDate = (date: Date) => date.toUTCString();

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

// Common cookie builder for OAuth state + access/refresh tokens.
const buildSetCookie = (name: string, value: string, maxAgeSec: number) => {
  const isSecure = env.NODE_ENV === 'production';
  const expiresAt = new Date(Date.now() + maxAgeSec * 1000);
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
    `Expires=${toCookieDate(expiresAt)}`
  ];
  if (isSecure) {
    parts.push('Secure');
  }
  return parts.join('; ');
};

const buildClearCookie = (name: string) => {
  const isSecure = env.NODE_ENV === 'production';
  const parts = [
    `${name}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ];
  if (isSecure) {
    parts.push('Secure');
  }
  return parts.join('; ');
};

const getJwtConfig = (): JwtConfig => {
  const accessSecret = env.JWT_ACCESS_SECRET ?? env.AUTH_SESSION_SECRET;
  const refreshSecret = env.JWT_REFRESH_SECRET ?? env.AUTH_SESSION_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT secrets are missing. Fill JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.');
  }

  return {
    accessSecret,
    refreshSecret,
    accessTtlSec: env.JWT_ACCESS_TTL_SECONDS ?? 60 * 15,
    refreshTtlSec: env.JWT_REFRESH_TTL_SECONDS ?? env.AUTH_SESSION_TTL_SECONDS
  };
};

const ensureOAuthConfig = () => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error('Google OAuth env is missing. Fill GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.');
  }
  getJwtConfig();
};

// DB에는 refresh 토큰 원문 대신 해시만 저장한다.
const hashRefreshToken = (token: string, refreshSecret: string) =>
  createHash('sha256').update(`${refreshSecret}:${token}`).digest('hex');

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

const verifyRefreshToken = (token: string, refreshSecret: string): RefreshClaims | null => {
  try {
    const decoded = jwt.verify(token, refreshSecret);
    if (!decoded || typeof decoded === 'string') {
      return null;
    }
    if (typeof decoded.sub !== 'string' || decoded.typ !== 'refresh' || typeof decoded.jti !== 'string') {
      return null;
    }
    return decoded as RefreshClaims;
  } catch {
    return null;
  }
};

const upsertUserByGoogleIdentity = async (googleUser: GoogleUserInfo) => {
  const supabase = getSupabaseAdminClient();
  const provider = 'google';

  const { data: identity, error: identityError } = await supabase
    .from('auth_identities')
    .select('user_id')
    .eq('provider', provider)
    .eq('provider_user_id', googleUser.sub)
    .maybeSingle();

  if (identityError) {
    throw identityError;
  }

  if (identity?.user_id) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('id', identity.user_id)
      .single<UserRecord>();

    if (userError) {
      throw userError;
    }

    return user;
  }

  const { data: insertedUser, error: insertUserError } = await supabase
    .from('users')
    .insert({
      email: googleUser.email ?? null,
      display_name: googleUser.name ?? null
    })
    .select('id, email, display_name')
    .single<UserRecord>();

  if (insertUserError) {
    throw insertUserError;
  }

  const { error: insertIdentityError } = await supabase.from('auth_identities').insert({
    user_id: insertedUser.id,
    provider,
    provider_user_id: googleUser.sub,
    provider_email: googleUser.email ?? null
  });

  if (insertIdentityError) {
    if (insertIdentityError.code === '23505') {
      const { data: existingIdentity, error: existingIdentityError } = await supabase
        .from('auth_identities')
        .select('user_id')
        .eq('provider', provider)
        .eq('provider_user_id', googleUser.sub)
        .single();

      if (existingIdentityError) {
        throw existingIdentityError;
      }

      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('id, email, display_name')
        .eq('id', existingIdentity.user_id)
        .single<UserRecord>();

      if (existingUserError) {
        throw existingUserError;
      }

      return existingUser;
    }
    throw insertIdentityError;
  }

  return insertedUser;
};

const issueTokenPair = async (user: UserRecord) => {
  const { accessSecret, refreshSecret, accessTtlSec, refreshTtlSec } = getJwtConfig();
  const supabase = getSupabaseAdminClient();

  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      displayName: user.display_name
    },
    accessSecret,
    { expiresIn: accessTtlSec }
  );

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      typ: 'refresh',
      jti: randomBytes(16).toString('hex')
    },
    refreshSecret,
    { expiresIn: refreshTtlSec }
  );

  const refreshHash = hashRefreshToken(refreshToken, refreshSecret);
  const refreshExpiresAt = new Date(Date.now() + refreshTtlSec * 1000);

  const { error: sessionError } = await supabase.from('sessions').insert({
    user_id: user.id,
    session_token_hash: refreshHash,
    expires_at: refreshExpiresAt.toISOString()
  });

  if (sessionError) {
    throw sessionError;
  }

  return {
    accessToken,
    refreshToken,
    accessTtlSec,
    refreshTtlSec
  };
};

const getActiveRefreshSession = async (refreshToken: string) => {
  const { refreshSecret } = getJwtConfig();
  const supabase = getSupabaseAdminClient();
  const refreshHash = hashRefreshToken(refreshToken, refreshSecret);
  const nowIso = new Date().toISOString();

  const { data: session, error } = await supabase
    .from('sessions')
    .select('id, user_id, expires_at')
    .eq('session_token_hash', refreshHash)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .maybeSingle<SessionRecord>();

  if (error) {
    throw error;
  }

  return session ?? null;
};

const revokeRefreshSession = async (refreshToken: string) => {
  const { refreshSecret } = getJwtConfig();
  const supabase = getSupabaseAdminClient();
  const refreshHash = hashRefreshToken(refreshToken, refreshSecret);

  await supabase
    .from('sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('session_token_hash', refreshHash)
    .is('revoked_at', null);
};

const loadUserById = async (userId: string) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, email, display_name')
    .eq('id', userId)
    .single<UserRecord>();

  if (error) {
    throw error;
  }

  return data;
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get('/auth/google/start', async (_req, reply) => {
    try {
      ensureOAuthConfig();
      // OAuth callback CSRF protection.
      const state = randomBytes(16).toString('hex');
      const query = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID as string,
        redirect_uri: env.GOOGLE_REDIRECT_URI as string,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
        state
      });

      reply.header('Set-Cookie', buildSetCookie(OAUTH_STATE_COOKIE_NAME, state, 60 * 10));
      return reply.redirect(`${GOOGLE_AUTH_URL}?${query.toString()}`);
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'Google OAuth is not configured.' });
    }
  });

  app.get('/auth/google/callback', async (req, reply) => {
    try {
      ensureOAuthConfig();
      const query = req.query as {
        code?: string;
        state?: string;
        error?: string;
      };

      if (query.error) {
        return reply.code(400).send({ message: 'OAuth failed at Google provider.', providerError: query.error });
      }
      if (!query.code || !query.state) {
        return reply.code(400).send({ message: 'Missing OAuth callback parameters.' });
      }

      const cookies = parseCookieHeader(req.headers.cookie);
      const stateCookie = cookies[OAUTH_STATE_COOKIE_NAME];
      if (!stateCookie || stateCookie !== query.state) {
        reply.header('Set-Cookie', buildClearCookie(OAUTH_STATE_COOKIE_NAME));
        return reply.code(400).send({ message: 'Invalid OAuth state.' });
      }

      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code: query.code,
          client_id: env.GOOGLE_CLIENT_ID as string,
          client_secret: env.GOOGLE_CLIENT_SECRET as string,
          redirect_uri: env.GOOGLE_REDIRECT_URI as string,
          grant_type: 'authorization_code'
        }).toString()
      });

      if (!tokenRes.ok) {
        const body = await tokenRes.text();
        app.log.error({ status: tokenRes.status, body }, 'Google token exchange failed');
        return reply.code(400).send({ message: 'Google token exchange failed.' });
      }

      const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
      if (!tokenJson.access_token) {
        return reply.code(400).send({ message: 'Google access token is missing.' });
      }

      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`
        }
      });

      if (!userInfoRes.ok) {
        const body = await userInfoRes.text();
        app.log.error({ status: userInfoRes.status, body }, 'Google userinfo request failed');
        return reply.code(400).send({ message: 'Google user profile fetch failed.' });
      }

      const userInfo = (await userInfoRes.json()) as GoogleUserInfo;
      if (!userInfo.sub) {
        return reply.code(400).send({ message: 'Google user identity is missing.' });
      }

      const user = await upsertUserByGoogleIdentity(userInfo);
      const { accessToken, refreshToken, accessTtlSec, refreshTtlSec } = await issueTokenPair(user);

      reply.header('Set-Cookie', [
        buildClearCookie(OAUTH_STATE_COOKIE_NAME),
        buildSetCookie(ACCESS_COOKIE_NAME, accessToken, accessTtlSec),
        buildSetCookie(REFRESH_COOKIE_NAME, refreshToken, refreshTtlSec)
      ]);
      return reply.redirect(env.WEB_ORIGIN);
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'OAuth callback handling failed.' });
    }
  });

  app.get('/auth/me', async (req, reply) => {
    try {
      const { accessSecret } = getJwtConfig();
      const cookies = parseCookieHeader(req.headers.cookie);
      const accessToken = cookies[ACCESS_COOKIE_NAME];

      if (!accessToken) {
        return reply.code(200).send({ authenticated: false });
      }

      const claims = verifyAccessToken(accessToken, accessSecret);
      if (!claims) {
        return reply.code(200).send({ authenticated: false });
      }

      return reply.code(200).send({
        authenticated: true,
        user: {
          id: claims.sub,
          email: claims.email ?? null,
          displayName: claims.displayName ?? null
        }
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'Failed to read auth session.' });
    }
  });

  app.patch('/auth/me', async (req, reply) => {
    try {
      const { accessSecret } = getJwtConfig();
      const cookies = parseCookieHeader(req.headers.cookie);
      const accessToken = cookies[ACCESS_COOKIE_NAME];

      if (!accessToken) {
        return reply.code(401).send({ message: 'Authentication required.' });
      }

      const claims = verifyAccessToken(accessToken, accessSecret);
      if (!claims) {
        return reply.code(401).send({ message: 'Authentication required.' });
      }

      const parsed = UpdateMeSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid profile payload',
          issues: parsed.error.issues
        });
      }

      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('users')
        .update({ display_name: parsed.data.displayName })
        .eq('id', claims.sub)
        .select('id, email, display_name')
        .single<UserRecord>();

      if (error) {
        throw error;
      }

      return reply.code(200).send({
        authenticated: true,
        user: {
          id: data.id,
          email: data.email ?? null,
          displayName: data.display_name ?? null
        }
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'Failed to update profile.' });
    }
  });

  app.post('/auth/refresh', async (req, reply) => {
    try {
      const { refreshSecret } = getJwtConfig();
      const cookies = parseCookieHeader(req.headers.cookie);
      const refreshToken = cookies[REFRESH_COOKIE_NAME];

      if (!refreshToken) {
        return reply.code(401).send({ message: 'Refresh token is missing.' });
      }

      const refreshClaims = verifyRefreshToken(refreshToken, refreshSecret);
      if (!refreshClaims) {
        reply.header('Set-Cookie', [
          buildClearCookie(ACCESS_COOKIE_NAME),
          buildClearCookie(REFRESH_COOKIE_NAME)
        ]);
        return reply.code(401).send({ message: 'Invalid refresh token.' });
      }

      const session = await getActiveRefreshSession(refreshToken);
      if (!session || session.user_id !== refreshClaims.sub) {
        reply.header('Set-Cookie', [
          buildClearCookie(ACCESS_COOKIE_NAME),
          buildClearCookie(REFRESH_COOKIE_NAME)
        ]);
        return reply.code(401).send({ message: 'Refresh session is not active.' });
      }

      const user = await loadUserById(refreshClaims.sub);

      // Refresh token rotation.
      await revokeRefreshSession(refreshToken);
      const next = await issueTokenPair(user);

      reply.header('Set-Cookie', [
        buildSetCookie(ACCESS_COOKIE_NAME, next.accessToken, next.accessTtlSec),
        buildSetCookie(REFRESH_COOKIE_NAME, next.refreshToken, next.refreshTtlSec)
      ]);

      return reply.code(200).send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'Token refresh failed.' });
    }
  });

  app.post('/auth/logout', async (req, reply) => {
    try {
      const cookies = parseCookieHeader(req.headers.cookie);
      const refreshToken = cookies[REFRESH_COOKIE_NAME];

      if (refreshToken) {
        await revokeRefreshSession(refreshToken);
      }

      reply.header('Set-Cookie', [
        buildClearCookie(ACCESS_COOKIE_NAME),
        buildClearCookie(REFRESH_COOKIE_NAME)
      ]);
      return reply.code(200).send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'Logout failed.' });
    }
  });
};
