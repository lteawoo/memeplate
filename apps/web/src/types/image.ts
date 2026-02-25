export type MemeImageVisibility = 'private' | 'public';

export type RemixCommentRecord = {
  id: string;
  imageId: string;
  authorId: string;
  authorDisplayName?: string;
  rootCommentId?: string;
  replyToCommentId?: string;
  replyToAuthorDisplayName?: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type MemeImageRecord = {
  id: string;
  ownerId?: string;
  ownerDisplayName?: string;
  templateId?: string;
  title: string;
  description?: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  imageBytes?: number;
  imageMime?: string;
  visibility: MemeImageVisibility;
  shareSlug: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type MemeImageResponse = {
  image: MemeImageRecord;
  likedByMe?: boolean;
  comments?: RemixCommentRecord[];
  commentsTotalCount?: number;
};

export type MemeImagesResponse = {
  images: MemeImageRecord[];
};

export type RemixCommentsResponse = {
  comments: RemixCommentRecord[];
  totalCount: number;
};

export type RemixCommentCreateResponse = {
  comment: RemixCommentRecord;
  totalCount: number;
};
