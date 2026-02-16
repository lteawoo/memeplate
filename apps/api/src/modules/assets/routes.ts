import type { FastifyPluginAsync } from 'fastify';

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const assetRoutes: FastifyPluginAsync = async (app) => {
  app.get('/assets/proxy', async (req, reply) => {
    const url = String((req.query as Record<string, unknown> | undefined)?.url ?? '');

    if (!url || !isHttpUrl(url)) {
      return reply.code(400).send({ message: 'Invalid url query.' });
    }

    try {
      const upstream = await fetch(url, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!upstream.ok) {
        return reply.code(502).send({ message: 'Failed to fetch remote asset.' });
      }

      const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
      const contentLength = upstream.headers.get('content-length');
      const cacheControl = upstream.headers.get('cache-control') ?? 'public, max-age=3600';

      const body = Buffer.from(await upstream.arrayBuffer());

      reply.header('Content-Type', contentType);
      if (contentLength) {
        reply.header('Content-Length', contentLength);
      }
      reply.header('Cache-Control', cacheControl);

      return reply.send(body);
    } catch (error) {
      req.log.error({ error, url }, 'asset proxy failed');
      return reply.code(502).send({ message: 'Asset proxy failed.' });
    }
  });
};

