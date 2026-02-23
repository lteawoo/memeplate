import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplatePublicPeriod,
  TemplatePublicSortBy
} from '../../types/template.js';

export interface TemplateRecord {
  id: string;
  ownerId: string;
  ownerDisplayName?: string;
  title: string;
  description?: string;
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
  countRemixesByTemplateId(templateId: string): Promise<number>;
  listPublic(options: {
    limit: number;
    sortBy: TemplatePublicSortBy;
    period: TemplatePublicPeriod;
  }): Promise<TemplateRecord[]>;
  getDetailByShareSlug(shareSlug: string, viewerUserId?: string | null): Promise<TemplateRecord | null>;
  getPublicDetailByShareSlug(shareSlug: string): Promise<TemplateRecord | null>;
  getPublicByShareSlug(shareSlug: string): Promise<TemplateRecord | null>;
  incrementViewCountByShareSlug(shareSlug: string): Promise<number | null>;
  create(userId: string, input: CreateTemplateInput): Promise<TemplateRecord>;
  update(userId: string, templateId: string, input: UpdateTemplateInput): Promise<TemplateRecord>;
  remove(userId: string, templateId: string): Promise<void>;
}
