import type { CreateTemplateInput, UpdateTemplateInput } from '../../types/template.js';

export interface TemplateRecord {
  id: string;
  ownerId: string;
  ownerDisplayName?: string;
  title: string;
  content: Record<string, unknown>;
  thumbnailUrl?: string;
  viewCount: number;
  likeCount: number;
  visibility: 'private' | 'public';
  shareSlug: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateRepository {
  listMine(userId: string): Promise<TemplateRecord[]>;
  getMineById(userId: string, templateId: string): Promise<TemplateRecord | null>;
  listPublic(limit: number): Promise<TemplateRecord[]>;
  getPublicByShareSlug(shareSlug: string): Promise<TemplateRecord | null>;
  incrementViewCountByShareSlug(shareSlug: string): Promise<number | null>;
  create(userId: string, input: CreateTemplateInput): Promise<TemplateRecord>;
  update(userId: string, templateId: string, input: UpdateTemplateInput): Promise<TemplateRecord>;
  remove(userId: string, templateId: string): Promise<void>;
}
