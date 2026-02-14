import { createHash, randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { env } from '../../config/env.js';
import { getSupabaseAdminClient } from '../../lib/supabaseAdmin.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const SESSION_COOKIE_NAME = 'mp_session';
const OAUTH_STATE_COOKIE_NAME = 'mp_oauth_state';

type GoogleTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  scope?: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  name?: string;
};

type SessionRecord = {
  id: string;
  user_id: string;
  session_token_hash: string;
  expires_at: string;
  revoked_at: string | null;
};

type UserRecord = {
  id: string;
  email: string | null;
  display_name: string | null;
};

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

// Common cookie builder for both OAuth state and session token.
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

// Expire cookie immediately on client.
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

// Persist only hash in DB so raw session token is never stored server-side.
const hashSessionToken = (token: string) => {
  const secret = env.AUTH_SESSION_SECRET ?? '';
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
};

// Fail early when required auth env is missing.
const ensureAuthConfig = () => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error('Google OAuth env is missing. Fill GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.');
  }
  if (!env.AUTH_SESSION_SECRET) {
    throw new Error('AUTH_SESSION_SECRET is missing.');
  }
};

// Resolve local user by Google identity, create user/identity if first login.
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
    // If another request inserted identity first, read the latest mapping.
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

// Issue new session and store only token hash with expiry.
const issueSession = async (userId: string) => {
  const supabase = getSupabaseAdminClient();
  const sessionToken = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + env.AUTH_SESSION_TTL_SECONDS * 1000);

  const { error: sessionError } = await supabase.from('sessions').insert({
    user_id: userId,
    session_token_hash: tokenHash,
    expires_at: expiresAt.toISOString()
  });

  if (sessionError) {
    throw sessionError;
  }

  return { sessionToken, expiresAt };
};

// Validate active session token and resolve current user.
const findActiveSessionUser = async (sessionToken: string) => {
  const supabase = getSupabaseAdminClient();
  const tokenHash = hashSessionToken(sessionToken);
  const nowIso = new Date().toISOString();

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, user_id, session_token_hash, expires_at, revoked_at')
    .eq('session_token_hash', tokenHash)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .maybeSingle<SessionRecord>();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, display_name')
    .eq('id', session.user_id)
    .maybeSingle<UserRecord>();

  if (userError) {
    throw userError;
  }

  return user ?? null;
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get('/auth/google/start', async (_req, reply) => {
    try {
      ensureAuthConfig();
      // CSRF protection for OAuth callback.
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
      ensureAuthConfig();

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

      // Exchange authorization code for access token.
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

      // Fetch Google user profile and map to local user.
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
      const { sessionToken } = await issueSession(user.id);

      // Clear one-time OAuth state and issue login session cookie.
      reply.header('Set-Cookie', [
        buildClearCookie(OAUTH_STATE_COOKIE_NAME),
        buildSetCookie(SESSION_COOKIE_NAME, sessionToken, env.AUTH_SESSION_TTL_SECONDS)
      ]);
      return reply.redirect(env.WEB_ORIGIN);
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'OAuth callback handling failed.' });
    }
  });

  app.get('/auth/me', async (req, reply) => {
    try {
      const cookies = parseCookieHeader(req.headers.cookie);
      const sessionToken = cookies[SESSION_COOKIE_NAME];
      if (!sessionToken) {
        return reply.code(200).send({ authenticated: false });
      }

      const user = await findActiveSessionUser(sessionToken);
      if (!user) {
        reply.header('Set-Cookie', buildClearCookie(SESSION_COOKIE_NAME));
        return reply.code(200).send({ authenticated: false });
      }

      return reply.code(200).send({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name
        }
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'Failed to read auth session.' });
    }
  });

  app.post('/auth/logout', async (req, reply) => {
    try {
      const cookies = parseCookieHeader(req.headers.cookie);
      const sessionToken = cookies[SESSION_COOKIE_NAME];

      if (sessionToken) {
        const supabase = getSupabaseAdminClient();
        const tokenHash = hashSessionToken(sessionToken);
        // Soft-revoke session record.
        await supabase
          .from('sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('session_token_hash', tokenHash)
          .is('revoked_at', null);
      }

      reply.header('Set-Cookie', buildClearCookie(SESSION_COOKIE_NAME));
      return reply.code(200).send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'Logout failed.' });
    }
  });
};
