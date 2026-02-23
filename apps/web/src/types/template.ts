export type TemplateVisibility = 'private' | 'public';
export type TemplatePublicSortBy = 'latest' | 'likes' | 'views';
export type TemplatePublicPeriod = '24h' | '7d' | '30d' | '1y' | 'all';

export type TemplateRecord = {
  id: string;
  ownerId?: string;
  ownerDisplayName?: string;
  title: string;
  description?: string;
  content: Record<string, unknown>;
  thumbnailUrl?: string;
  viewCount?: number;
  likeCount?: number;
  visibility: TemplateVisibility;
  shareSlug: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TemplateResponse = {
  template: TemplateRecord;
  isOwner?: boolean;
  likedByMe?: boolean;
};

export type TemplatesResponse = {
  templates: TemplateRecord[];
};
