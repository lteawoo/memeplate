export type TemplateVisibility = 'private' | 'public';

export type TemplateRecord = {
  id: string;
  ownerId?: string;
  ownerDisplayName?: string;
  title: string;
  content: Record<string, unknown>;
  thumbnailUrl?: string;
  visibility: TemplateVisibility;
  shareSlug: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TemplateResponse = {
  template: TemplateRecord;
};

export type TemplatesResponse = {
  templates: TemplateRecord[];
};
