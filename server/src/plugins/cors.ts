import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export const registerCors = async (app: FastifyInstance) => {
  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true
  });
};
