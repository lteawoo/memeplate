import type { FastifyPluginAsync } from 'fastify';
import { requireAuth, resolveAuthUser } from '../auth/guard.js';
import { env } from '../../config/env.js';
import {
  CreateTemplateSchema,
  TemplatePublicPeriodSchema,
  TemplatePublicSortBySchema,
  TemplateIdParamSchema,
  TemplateShareSlugParamSchema,
  type TemplatePublicPeriod,
  type TemplatePublicSortBy,
  UpdateTemplateSchema
} from '../../types/template.js';
import { createSupabaseTemplateRepository } from './supabaseRepository.js';
import { uploadTemplateBackgroundDataUrl } from '../../lib/r2.js';
import { sanitizeTemplateContent } from './sanitizeTemplateContent.js';
import { buildMetricActorKey } from '../../lib/metricActorKey.js';
import { replyWithAttachmentFromRemoteImage } from '../../lib/attachmentDownload.js';

const applyBackgroundUrlToTemplateContent = (content: Record<string, unknown>, backgroundUrl: string) => {
  const nextContent = structuredClone(content) as Record<string, unknown>;
  const objects = Array.isArray(nextContent.objects)
    ? (nextContent.objects as Array<Record<string, unknown>>)
    : [];

  let replaced = false;
  for (const obj of objects) {
    if (obj.type !== 'image') continue;
    const src = typeof obj.src === 'string' ? obj.src : '';
    const isBackground = obj.name === 'background';
    const hasDataUrl = src.startsWith('data:image/');
    if (!replaced && (isBackground || hasDataUrl)) {
      obj.src = backgroundUrl;
      if (!obj.name) obj.name = 'background';
      replaced = true;
    }
  }

  if (!replaced && objects.length > 0) {
    const firstImageIndex = objects.findIndex((obj) => obj.type === 'image');
    if (firstImageIndex >= 0) {
      objects[firstImageIndex].src = backgroundUrl;
      if (!objects[firstImageIndex].name) objects[firstImageIndex].name = 'background';
      replaced = true;
    }
  }

  nextContent.objects = objects;
  return nextContent;
};

export const templateRoutes: FastifyPluginAsync = async (app) => {
  const repository = createSupabaseTemplateRepository();
  const registerTemplateResourceRoutes = (basePath: '/memeplates') => {
    app.get(`${basePath}/public`, async (req, reply) => {
      const query = (req.query as Record<string, unknown> | undefined) ?? {};
      const limitRaw = Number(query.limit ?? 20);
      const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : 20;
      const sortByRaw = typeof query.sortBy === 'string' ? query.sortBy : '';
      const periodRaw = typeof query.period === 'string' ? query.period : '';
      const sortByParsed = TemplatePublicSortBySchema.safeParse(sortByRaw);
      const periodParsed = TemplatePublicPeriodSchema.safeParse(periodRaw);
      const sortBy: TemplatePublicSortBy = sortByParsed.success ? sortByParsed.data : 'latest';
      const period: TemplatePublicPeriod = periodParsed.success ? periodParsed.data : 'all';

      const templates = await repository.listPublic({ limit, sortBy, period });
      return reply.send({ templates });
    });

    app.get(`${basePath}/s/:shareSlug/edit`, async (req, reply) => {
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

    app.get(`${basePath}/s/:shareSlug`, async (req, reply) => {
      const paramsParsed = TemplateShareSlugParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          message: 'Invalid share slug',
          issues: paramsParsed.error.issues
        });
      }

      const viewerUserId = resolveAuthUser(req)?.id ?? null;
      const template = await repository.getDetailByShareSlug(paramsParsed.data.shareSlug, viewerUserId);
      if (!template) {
        return reply.code(404).send({ message: 'Template not found.' });
      }
      const isOwner = Boolean(viewerUserId && template.ownerId && viewerUserId === template.ownerId);
      const actorKey = buildMetricActorKey(req);
      const likedByMe = template.visibility === 'public'
        ? (await repository.getLikeStateByShareSlug(paramsParsed.data.shareSlug, actorKey)) ?? false
        : false;
      if (template.visibility === 'private') {
        reply.header('Cache-Control', 'private, no-store');
      }
      return reply.send({ template, isOwner, likedByMe });
    });

    app.get(`${basePath}/s/:shareSlug/download`, async (req, reply) => {
      const paramsParsed = TemplateShareSlugParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          message: 'Invalid share slug',
          issues: paramsParsed.error.issues
        });
      }

      const viewerUserId = resolveAuthUser(req)?.id ?? null;
      const template = await repository.getDetailByShareSlug(paramsParsed.data.shareSlug, viewerUserId);
      if (!template) {
        return reply.code(404).send({ message: 'Template not found.' });
      }
      if (!template.thumbnailUrl) {
        return reply.code(404).send({ message: 'Template image not found.' });
      }

      return replyWithAttachmentFromRemoteImage(reply, {
        imageUrl: template.thumbnailUrl,
        fileBaseName: template.title || 'memeplate-template',
        fallbackBaseName: 'memeplate-template'
      });
    });

    app.post(`${basePath}/s/:shareSlug/view`, {
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

      const actorKey = buildMetricActorKey(req);
      const viewCount = await repository.incrementViewCountByShareSlug(paramsParsed.data.shareSlug, actorKey);
      if (viewCount === null) {
        return reply.code(404).send({ message: 'Template not found.' });
      }

      return reply.code(200).send({ viewCount });
    });

    app.post(`${basePath}/s/:shareSlug/like`, {
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

      const actorKey = buildMetricActorKey(req);
      const likeResult = await repository.toggleLikeByShareSlug(paramsParsed.data.shareSlug, actorKey);
      if (!likeResult) {
        return reply.code(404).send({ message: 'Template not found.' });
      }

      return reply.code(200).send(likeResult);
    });

    app.get(`${basePath}/me`, { preHandler: requireAuth }, async (req, reply) => {
      const templates = await repository.listMine(req.authUser!.id);
      return reply.send({ templates });
    });

    app.get(`${basePath}/:templateId`, { preHandler: requireAuth }, async (req, reply) => {
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

    app.post(basePath, { preHandler: requireAuth }, async (req, reply) => {
      const parsed = CreateTemplateSchema.safeParse(req.body);

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid template payload',
          issues: parsed.error.issues
        });
      }

      const { backgroundDataUrl, ...input } = parsed.data;
      const backgroundUrl = backgroundDataUrl
        ? await uploadTemplateBackgroundDataUrl(req.authUser!.id, backgroundDataUrl)
        : null;
      const normalizedContent = sanitizeTemplateContent(input.content);
      const content = backgroundUrl
        ? applyBackgroundUrlToTemplateContent(normalizedContent, backgroundUrl)
        : normalizedContent;

      const created = await repository.create(req.authUser!.id, {
        ...input,
        content
      });

      return reply.code(201).send({ template: created });
    });

    app.patch(`${basePath}/:templateId`, { preHandler: requireAuth }, async (req, reply) => {
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

      const existing = await repository.getMineById(req.authUser!.id, paramsParsed.data.templateId);
      if (!existing) {
        return reply.code(404).send({ message: 'Template not found.' });
      }

      const isPublicToPrivate = parsed.data.visibility === 'private' && existing.visibility === 'public';
      if (isPublicToPrivate) {
        const remixCount = await repository.countRemixesByTemplateId(existing.id);
        if (remixCount > 0) {
          return reply.code(409).send({
            message: '리믹스가 1개 이상 있는 밈플릿은 비공개로 전환할 수 없습니다.'
          });
        }
      }

      const { backgroundDataUrl, ...input } = parsed.data;
      const backgroundUrl = backgroundDataUrl
        ? await uploadTemplateBackgroundDataUrl(req.authUser!.id, backgroundDataUrl)
        : null;

      const normalizedContent = input.content
        ? sanitizeTemplateContent(input.content)
        : undefined;
      const content = normalizedContent && backgroundUrl
        ? applyBackgroundUrlToTemplateContent(normalizedContent, backgroundUrl)
        : normalizedContent;

      const updated = await repository.update(req.authUser!.id, paramsParsed.data.templateId, {
        ...input,
        content
      });

      return reply.send({ template: updated });
    });

    app.delete(`${basePath}/:templateId`, { preHandler: requireAuth }, async (req, reply) => {
      const paramsParsed = TemplateIdParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          message: 'Invalid template id',
          issues: paramsParsed.error.issues
        });
      }

      const existing = await repository.getMineById(req.authUser!.id, paramsParsed.data.templateId);
      if (!existing) {
        return reply.code(404).send({ message: 'Template not found.' });
      }

      const remixCount = await repository.countRemixesByTemplateId(existing.id);
      if (remixCount > 0) {
        return reply.code(409).send({
          message: '리믹스가 1개 이상 있는 밈플릿은 삭제할 수 없습니다.'
        });
      }

      await repository.remove(req.authUser!.id, paramsParsed.data.templateId);
      return reply.code(204).send();
    });
  };

  registerTemplateResourceRoutes('/memeplates');
};
