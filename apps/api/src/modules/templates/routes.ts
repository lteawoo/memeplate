import type { FastifyPluginAsync } from 'fastify';
import { CreateTemplateSchema, UpdateTemplateSchema } from '../../types/template.js';

export const templateRoutes: FastifyPluginAsync = async (app) => {
  app.get('/templates/me', async (_req, reply) => {
    return reply.code(501).send({
      message: 'List my templates endpoint is not implemented yet.'
    });
  });

  app.post('/templates', async (req, reply) => {
    const parsed = CreateTemplateSchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid template payload',
        issues: parsed.error.issues
      });
    }

    return reply.code(501).send({
      message: 'Create template endpoint is not implemented yet.'
    });
  });

  app.patch('/templates/:templateId', async (req, reply) => {
    const parsed = UpdateTemplateSchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid template payload',
        issues: parsed.error.issues
      });
    }

    return reply.code(501).send({
      message: 'Update template endpoint is not implemented yet.'
    });
  });

  app.delete('/templates/:templateId', async (_req, reply) => {
    return reply.code(501).send({
      message: 'Delete template endpoint is not implemented yet.'
    });
  });
};
