export type MemeImageVisibility = 'private' | 'public';

export type MemeImageRecord = {
  id: string;
  ownerId?: string;
  ownerDisplayName?: string;
  templateId?: string;
  title: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  imageBytes?: number;
  imageMime?: string;
  visibility: MemeImageVisibility;
  shareSlug: string;
  viewCount?: number;
  likeCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type MemeImageResponse = {
  image: MemeImageRecord;
};

export type MemeImagesResponse = {
  images: MemeImageRecord[];
};
