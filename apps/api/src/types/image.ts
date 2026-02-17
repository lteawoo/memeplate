import { z } from 'zod';

export const MemeImageVisibilitySchema = z.enum(['private', 'public']);

export const CreateMemeImageSchema = z.object({
  templateId: z.uuid().optional(),
  title: z.string().trim().min(1).max(100),
  imageUrl: z.string().url().optional(),
  imageDataUrl: z.string().startsWith('data:image/').optional(),
  imageWidth: z.number().int().positive().optional(),
  imageHeight: z.number().int().positive().optional(),
  imageBytes: z.number().int().nonnegative().optional(),
  imageMime: z.string().trim().min(1).max(100).optional(),
  visibility: MemeImageVisibilitySchema.default('private')
}).refine((value) => Boolean(value.imageUrl || value.imageDataUrl), {
  message: 'imageUrl or imageDataUrl is required',
  path: ['imageDataUrl']
});

export const UpdateMemeImageSchema = z.object({
  templateId: z.uuid().nullable().optional(),
  title: z.string().trim().min(1).max(100).optional(),
  imageUrl: z.string().url().optional(),
  imageDataUrl: z.string().startsWith('data:image/').optional(),
  imageWidth: z.number().int().positive().nullable().optional(),
  imageHeight: z.number().int().positive().nullable().optional(),
  imageBytes: z.number().int().nonnegative().nullable().optional(),
  imageMime: z.string().trim().min(1).max(100).nullable().optional(),
  visibility: MemeImageVisibilitySchema.optional()
});

export const MemeImageIdParamSchema = z.object({
  imageId: z.uuid()
});

export const MemeImageShareSlugParamSchema = z.object({
  shareSlug: z.string().min(6).max(64)
});

export type CreateMemeImageInput = z.infer<typeof CreateMemeImageSchema>;
export type UpdateMemeImageInput = z.infer<typeof UpdateMemeImageSchema>;
