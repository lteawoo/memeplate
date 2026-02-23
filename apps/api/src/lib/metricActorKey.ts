import { createHmac } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { resolveAuthUser } from '../modules/auth/guard.js';

const resolveActorHashSecret = () =>
  env.METRIC_ACTOR_HASH_SECRET
  ?? env.AUTH_SESSION_SECRET
  ?? env.JWT_ACCESS_SECRET
  ?? 'memeplate-dev-metric-secret';

const normalizeHeaderValue = (value: string | string[] | undefined) => {
  if (!value) return '';
  const first = Array.isArray(value) ? value[0] : value;
  return first.trim().toLowerCase();
};

export const buildMetricActorKey = (request: FastifyRequest) => {
  const authUser = resolveAuthUser(request);
  const userAgent = normalizeHeaderValue(request.headers['user-agent']);
  const remoteIp = request.ip?.trim() || 'unknown-ip';
  const actorSource = authUser?.id
    ? `user:${authUser.id}`
    : `anon:${remoteIp}:${userAgent}`;
  return createHmac('sha256', resolveActorHashSecret()).update(actorSource).digest('hex');
};
