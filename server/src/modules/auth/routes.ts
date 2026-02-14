import type { FastifyPluginAsync } from 'fastify';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get('/auth/google/start', async (_req, reply) => {
    return reply.code(501).send({
      message: 'Google OAuth start endpoint is not implemented yet.'
    });
  });

  app.get('/auth/google/callback', async (_req, reply) => {
    return reply.code(501).send({
      message: 'Google OAuth callback endpoint is not implemented yet.'
    });
  });

  app.post('/auth/logout', async (_req, reply) => {
    return reply.code(501).send({
      message: 'Logout endpoint is not implemented yet.'
    });
  });
};
