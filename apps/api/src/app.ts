import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { env } from './config/env.js';
import { registerCors } from './plugins/cors.js';
import { authRoutes } from './modules/auth/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { templateRoutes } from './modules/templates/routes.js';

export const buildApp = () => {
  const app = Fastify({
    logger: true
  });

  app.get('/healthz', async () => {
    return {
      ok: true,
      service: 'memeplate-api'
    };
  });

  app.register(registerCors);
  app.register(healthRoutes, { prefix: '/api/v1' });
  app.register(authRoutes, { prefix: '/api/v1' });
  app.register(templateRoutes, { prefix: '/api/v1' });

  const distRoot = resolve(process.cwd(), env.WEB_DIST_DIR ?? '../web/dist');
  const shouldServeStatic = env.NODE_ENV === 'production' && existsSync(distRoot);

  if (shouldServeStatic) {
    app.register(fastifyStatic, {
      root: distRoot,
      serve: false
    });

    app.get('/*', (request, reply) => {
      if (request.url.startsWith('/api') || request.url === '/healthz') {
        return reply.code(404).send({ message: 'Not Found' });
      }

      const pathname = request.url.split('?')[0];
      const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const absolutePath = resolve(distRoot, relativePath);
      const isInsideDist = absolutePath === distRoot || absolutePath.startsWith(`${distRoot}${sep}`);

      if (isInsideDist && existsSync(absolutePath)) {
        return reply.sendFile(relativePath);
      }

      return reply.type('text/html').sendFile('index.html');
    });
  }

  return app;
};
