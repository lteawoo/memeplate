import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../auth/guard.js';
import { env } from '../../config/env.js';
import {
  CreateTemplateSchema,
  TemplateIdParamSchema,
  TemplateShareSlugParamSchema,
  UpdateTemplateSchema
} from '../../types/template.js';
import { createSupabaseTemplateRepository } from './supabaseRepository.js';
import { uploadTemplateThumbnailDataUrl } from '../../lib/r2.js';
import { sanitizeTemplateContent } from './sanitizeTemplateContent.js';

export const templateRoutes: FastifyPluginAsync = async (app) => {
  const repository = createSupabaseTemplateRepository();

  app.get('/templates/public', async (req, reply) => {
    const limitRaw = Number((req.query as Record<string, unknown> | undefined)?.limit ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : 20;

    const templates = await repository.listPublic(limit);
    return reply.send({ templates });
  });

  app.get('/templates/s/:shareSlug/edit', async (req, reply) => {
    const paramsParsed = TemplateShareSlugParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        message: 'Invalid share slug',
        issues: paramsParsed.error.issues
      });
    }

    const template = await repository.getPublicByShareSlug(paramsParsed.data.shareSlug);
    if (!template) {
      return reply.code(404).send({ message: 'Template not found.' });
    }
    return reply.send({ template });
  });

  app.get('/templates/s/:shareSlug', async (req, reply) => {
    const paramsParsed = TemplateShareSlugParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        message: 'Invalid share slug',
        issues: paramsParsed.error.issues
      });
    }

    const template = await repository.getPublicByShareSlug(paramsParsed.data.shareSlug);
    if (!template) {
      return reply.code(404).send({ message: 'Template not found.' });
    }

    // 상세 페이지는 편집용 원본 content가 필요 없으므로 경량 응답으로 반환한다.
    const detailTemplate = {
      ...template,
      content: {}
    };
    return reply.send({ template: detailTemplate });
  });

  app.post('/templates/s/:shareSlug/view', {
    config: {
      rateLimit: {
        max: env.VIEW_RATE_LIMIT_MAX_PER_MINUTE ?? 30,
        timeWindow: '1 minute'
      }
    }
  }, async (req, reply) => {
    const paramsParsed = TemplateShareSlugParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        message: 'Invalid share slug',
        issues: paramsParsed.error.issues
      });
    }

    const viewCount = await repository.incrementViewCountByShareSlug(paramsParsed.data.shareSlug);
    if (viewCount === null) {
      return reply.code(404).send({ message: 'Template not found.' });
    }

    return reply.code(200).send({ viewCount });
  });

  app.get('/templates/me', { preHandler: requireAuth }, async (req, reply) => {
    const templates = await repository.listMine(req.authUser!.id);
    return reply.send({ templates });
  });

  app.get('/templates/:templateId', { preHandler: requireAuth }, async (req, reply) => {
    const paramsParsed = TemplateIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        message: 'Invalid template id',
        issues: paramsParsed.error.issues
      });
    }

    const template = await repository.getMineById(req.authUser!.id, paramsParsed.data.templateId);
    if (!template) {
      return reply.code(404).send({ message: 'Template not found.' });
    }

    return reply.send({ template });
  });

  app.post('/templates', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = CreateTemplateSchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid template payload',
        issues: parsed.error.issues
      });
    }

    const { thumbnailDataUrl, ...input } = parsed.data;
    const thumbnailUrl = thumbnailDataUrl
      ? await uploadTemplateThumbnailDataUrl(req.authUser!.id, thumbnailDataUrl)
      : input.thumbnailUrl;

    const created = await repository.create(req.authUser!.id, {
      ...input,
      content: sanitizeTemplateContent(input.content),
      thumbnailUrl
    });

    return reply.code(201).send({ template: created });
  });

  app.patch('/templates/:templateId', { preHandler: requireAuth }, async (req, reply) => {
    const paramsParsed = TemplateIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        message: 'Invalid template id',
        issues: paramsParsed.error.issues
      });
    }

    const parsed = UpdateTemplateSchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid template payload',
        issues: parsed.error.issues
      });
    }

    const { thumbnailDataUrl, ...input } = parsed.data;
    const thumbnailUrl = thumbnailDataUrl
      ? await uploadTemplateThumbnailDataUrl(req.authUser!.id, thumbnailDataUrl)
      : input.thumbnailUrl;

    const normalizedContent = input.content
      ? sanitizeTemplateContent(input.content)
      : undefined;

    const updated = await repository.update(req.authUser!.id, paramsParsed.data.templateId, {
      ...input,
      content: normalizedContent,
      thumbnailUrl
    });

    return reply.send({ template: updated });
  });

  app.delete('/templates/:templateId', { preHandler: requireAuth }, async (req, reply) => {
    const paramsParsed = TemplateIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply.code(400).send({
        message: 'Invalid template id',
        issues: paramsParsed.error.issues
      });
    }

    await repository.remove(req.authUser!.id, paramsParsed.data.templateId);
    return reply.code(204).send();
  });
};
