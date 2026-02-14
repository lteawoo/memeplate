import { z } from 'zod';

export const TemplateVisibilitySchema = z.enum(['private', 'public']);

export const CreateTemplateSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.record(z.string(), z.unknown()),
  thumbnailUrl: z.string().url().optional(),
  visibility: TemplateVisibilitySchema.default('private')
});

export const UpdateTemplateSchema = CreateTemplateSchema.partial();

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
