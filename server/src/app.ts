import Fastify from 'fastify';
import { registerCors } from './plugins/cors.js';
import { authRoutes } from './modules/auth/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { templateRoutes } from './modules/templates/routes.js';

export const buildApp = () => {
  const app = Fastify({
    logger: true
  });

  app.register(registerCors);
  app.register(healthRoutes, { prefix: '/api/v1' });
  app.register(authRoutes, { prefix: '/api/v1' });
  app.register(templateRoutes, { prefix: '/api/v1' });

  return app;
};
