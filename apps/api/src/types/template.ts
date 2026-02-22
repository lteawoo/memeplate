import { z } from 'zod';

export const TemplateVisibilitySchema = z.enum(['private', 'public']);
const SingleLineTitleSchema = z.string().trim().min(1).max(100).refine(
  (value) => !/[\r\n]/.test(value),
  { message: 'title must be a single line' }
);
const DescriptionSchema = z.string().trim().max(500);

export const CreateTemplateSchema = z.object({
  title: SingleLineTitleSchema,
  description: DescriptionSchema.optional(),
  content: z.record(z.string(), z.unknown()),
  backgroundDataUrl: z.string().startsWith('data:image/').optional(),
  visibility: TemplateVisibilitySchema.default('private')
});

export const UpdateTemplateSchema = z.object({
  title: SingleLineTitleSchema.optional(),
  description: DescriptionSchema.optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  backgroundDataUrl: z.string().startsWith('data:image/').optional(),
  visibility: TemplateVisibilitySchema.optional()
});

export const TemplateIdParamSchema = z.object({
  templateId: z.uuid()
});

export const TemplateShareSlugParamSchema = z.object({
  shareSlug: z.string().min(6).max(64)
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
