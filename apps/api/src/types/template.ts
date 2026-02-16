import { z } from 'zod';

export const TemplateVisibilitySchema = z.enum(['private', 'public']);

export const CreateTemplateSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.record(z.string(), z.unknown()),
  thumbnailUrl: z.string().url().optional(),
  thumbnailDataUrl: z.string().startsWith('data:image/').optional(),
  visibility: TemplateVisibilitySchema.default('private')
});

export const UpdateTemplateSchema = CreateTemplateSchema.partial();

export const TemplateIdParamSchema = z.object({
  templateId: z.uuid()
});

export const TemplateShareSlugParamSchema = z.object({
  shareSlug: z.string().min(6).max(64)
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
