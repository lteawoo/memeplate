import type { CreateTemplateInput, UpdateTemplateInput } from '../../types/template.js';

export interface TemplateRecord {
  id: string;
  ownerId: string;
  title: string;
  content: Record<string, unknown>;
  thumbnailUrl?: string;
  visibility: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
}

export interface TemplateRepository {
  listMine(userId: string): Promise<TemplateRecord[]>;
  create(userId: string, input: CreateTemplateInput): Promise<TemplateRecord>;
  update(userId: string, templateId: string, input: UpdateTemplateInput): Promise<TemplateRecord>;
  remove(userId: string, templateId: string): Promise<void>;
}
