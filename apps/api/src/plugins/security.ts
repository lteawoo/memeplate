import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export const registerSecurity = async (app: FastifyInstance) => {
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false
  });

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX_PER_MINUTE ?? 120,
    timeWindow: '1 minute'
  });
};
