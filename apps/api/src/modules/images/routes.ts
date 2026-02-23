import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { requireAuth } from '../auth/guard.js';
import {
  CreateMemeImageSchema,
  MemeImageIdParamSchema,
  MemeImageShareSlugParamSchema,
  UpdateMemeImageSchema
} from '../../types/image.js';
import { uploadMemeImageDataUrl } from '../../lib/r2.js';
import { createSupabaseMemeImageRepository } from './supabaseRepository.js';
import { buildMetricActorKey } from '../../lib/metricActorKey.js';

export const memeImageRoutes: FastifyPluginAsync = async (app) => {
  const repository = createSupabaseMemeImageRepository();
  const PublicImagesQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
    templateId: z.uuid().optional()
  });
  const registerRemixResourceRoutes = (basePath: '/remixes') => {
    app.get(`${basePath}/public`, async (req, reply) => {
      const parsed = PublicImagesQuerySchema.safeParse(req.query ?? {});
      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid images query',
          issues: parsed.error.issues
        });
      }
      const limit = parsed.data.limit ?? 20;
      const images = await repository.listPublic(limit, parsed.data.templateId);
      return reply.send({ images });
    });

    app.get(`${basePath}/s/:shareSlug`, async (req, reply) => {
      const paramsParsed = MemeImageShareSlugParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          message: 'Invalid share slug',
          issues: paramsParsed.error.issues
        });
      }

      const image = await repository.getPublicByShareSlug(paramsParsed.data.shareSlug);
      if (!image) {
        return reply.code(404).send({ message: 'Image not found.' });
      }
      const actorKey = buildMetricActorKey(req);
      const likedByMe = (await repository.getLikeStateByShareSlug(paramsParsed.data.shareSlug, actorKey)) ?? false;
      return reply.send({ image, likedByMe });
    });

    app.post(`${basePath}/s/:shareSlug/view`, {
      config: {
        rateLimit: {
          max: env.VIEW_RATE_LIMIT_MAX_PER_MINUTE ?? 30,
          timeWindow: '1 minute'
        }
      }
    }, async (req, reply) => {
      const paramsParsed = MemeImageShareSlugParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          message: 'Invalid share slug',
          issues: paramsParsed.error.issues
        });
      }

      const actorKey = buildMetricActorKey(req);
      const viewCount = await repository.incrementViewCountByShareSlug(paramsParsed.data.shareSlug, actorKey);
      if (viewCount === null) {
        return reply.code(404).send({ message: 'Image not found.' });
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
      const paramsParsed = MemeImageShareSlugParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          message: 'Invalid share slug',
          issues: paramsParsed.error.issues
        });
      }

      const actorKey = buildMetricActorKey(req);
      const likeResult = await repository.toggleLikeByShareSlug(paramsParsed.data.shareSlug, actorKey);
      if (!likeResult) {
        return reply.code(404).send({ message: 'Image not found.' });
      }
      return reply.code(200).send(likeResult);
    });

    app.get(`${basePath}/me`, { preHandler: requireAuth }, async (req, reply) => {
      const images = await repository.listMine(req.authUser!.id);
      return reply.send({ images });
    });

    app.get(`${basePath}/:imageId`, { preHandler: requireAuth }, async (req, reply) => {
      const paramsParsed = MemeImageIdParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          message: 'Invalid image id',
          issues: paramsParsed.error.issues
        });
      }

      const image = await repository.getMineById(req.authUser!.id, paramsParsed.data.imageId);
      if (!image) {
        return reply.code(404).send({ message: 'Image not found.' });
      }

      return reply.send({ image });
    });

    app.post(basePath, { preHandler: requireAuth }, async (req, reply) => {
      const parsed = CreateMemeImageSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid image payload',
          issues: parsed.error.issues
        });
      }

      const { imageDataUrl, ...input } = parsed.data;
      const imageUrl = imageDataUrl
        ? await uploadMemeImageDataUrl(req.authUser!.id, imageDataUrl)
        : input.imageUrl;

      const created = await repository.create(req.authUser!.id, {
        ...input,
        imageUrl
      });

      return reply.code(201).send({ image: created });
    });

    app.patch(`${basePath}/:imageId`, { preHandler: requireAuth }, async (req, reply) => {
      const paramsParsed = MemeImageIdParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          message: 'Invalid image id',
          issues: paramsParsed.error.issues
        });
      }

      const parsed = UpdateMemeImageSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid image payload',
          issues: parsed.error.issues
        });
      }

      const { imageDataUrl, ...input } = parsed.data;
      const imageUrl = imageDataUrl
        ? await uploadMemeImageDataUrl(req.authUser!.id, imageDataUrl)
        : input.imageUrl;

      const updated = await repository.update(req.authUser!.id, paramsParsed.data.imageId, {
        ...input,
        imageUrl
      });

      return reply.send({ image: updated });
    });

    app.delete(`${basePath}/:imageId`, { preHandler: requireAuth }, async (req, reply) => {
      const paramsParsed = MemeImageIdParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          message: 'Invalid image id',
          issues: paramsParsed.error.issues
        });
      }

      await repository.remove(req.authUser!.id, paramsParsed.data.imageId);
      return reply.code(204).send();
    });
  };

  registerRemixResourceRoutes('/remixes');
};
