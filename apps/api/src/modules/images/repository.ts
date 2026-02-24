import type { CreateMemeImageInput, UpdateMemeImageInput } from '../../types/image.js';

export interface MemeImageRecord {
  id: string;
  ownerId: string;
  ownerDisplayName?: string;
  templateId?: string;
  title: string;
  description?: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  imageBytes?: number;
  imageMime?: string;
  visibility: 'private' | 'public';
  shareSlug: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RemixCommentRecord {
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
}

export interface MemeImageRepository {
  listMine(userId: string): Promise<MemeImageRecord[]>;
  getMineById(userId: string, imageId: string): Promise<MemeImageRecord | null>;
  listPublic(limit: number, templateId?: string): Promise<MemeImageRecord[]>;
  getPublicByShareSlug(shareSlug: string): Promise<MemeImageRecord | null>;
  listPublicCommentsByShareSlug(shareSlug: string, limit: number): Promise<{
    comments: RemixCommentRecord[];
    totalCount: number;
  } | null>;
  createCommentByShareSlug(
    userId: string,
    shareSlug: string,
    body: string,
    replyToCommentId?: string
  ): Promise<{
    comment: RemixCommentRecord;
    totalCount: number;
  } | null>;
  getLikeStateByShareSlug(shareSlug: string, actorKey: string): Promise<boolean | null>;
  incrementViewCountByShareSlug(shareSlug: string, actorKey: string): Promise<number | null>;
  toggleLikeByShareSlug(shareSlug: string, actorKey: string): Promise<{ likeCount: number; liked: boolean } | null>;
  create(userId: string, input: CreateMemeImageInput): Promise<MemeImageRecord>;
  update(userId: string, imageId: string, input: UpdateMemeImageInput): Promise<MemeImageRecord>;
  remove(userId: string, imageId: string): Promise<void>;
}
