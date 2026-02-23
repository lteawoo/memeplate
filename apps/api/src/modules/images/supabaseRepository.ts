import { randomBytes } from 'node:crypto';
import { getSupabaseAdminClient } from '../../lib/supabaseAdmin.js';
import type { CreateMemeImageInput, UpdateMemeImageInput } from '../../types/image.js';
import type { MemeImageRecord, MemeImageRepository } from './repository.js';

type MemeImageRow = {
  id: string;
  owner_id: string;
  users?: {
    display_name: string | null;
  } | Array<{
    display_name: string | null;
  }> | null;
  template_id: string | null;
  title: string;
  description: string | null;
  image_url: string;
  image_width: number | null;
  image_height: number | null;
  image_bytes: number | null;
  image_mime: string | null;
  visibility: 'private' | 'public';
  share_slug: string;
  view_count: number | null;
  like_count: number | null;
  created_at: string;
  updated_at: string;
};

const toRecord = (row: MemeImageRow, ownerDisplayName?: string | null): MemeImageRecord => ({
  id: row.id,
  ownerId: row.owner_id,
  ownerDisplayName: ownerDisplayName ?? undefined,
  templateId: row.template_id ?? undefined,
  title: row.title,
  description: row.description ?? undefined,
  imageUrl: row.image_url,
  imageWidth: row.image_width ?? undefined,
  imageHeight: row.image_height ?? undefined,
  imageBytes: row.image_bytes ?? undefined,
  imageMime: row.image_mime ?? undefined,
  visibility: row.visibility,
  shareSlug: row.share_slug,
  viewCount: row.view_count ?? 0,
  likeCount: row.like_count ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const extractDisplayName = (users: MemeImageRow['users']) => {
  if (!users) return undefined;
  if (Array.isArray(users)) return users[0]?.display_name ?? undefined;
  return users.display_name ?? undefined;
};

const generateShareSlug = () => `img_${randomBytes(6).toString('base64url')}`;

const parseToggleLikeResult = (payload: unknown): { likeCount: number; liked: boolean } | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const likeCountRaw = 'likeCount' in payload ? (payload as { likeCount?: unknown }).likeCount : undefined;
  const likedRaw = 'liked' in payload ? (payload as { liked?: unknown }).liked : undefined;
  const likeCount = Number(likeCountRaw);
  if (!Number.isFinite(likeCount) || typeof likedRaw !== 'boolean') return null;
  return {
    likeCount: Math.max(0, Math.floor(likeCount)),
    liked: likedRaw
  };
};

const isMissingToggleLikeRpcError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error && typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : '';
  const message = 'message' in error && typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message
    : '';
  return code === 'PGRST202' || message.includes('toggle_meme_image_like_count');
};

const isMissingMetricActorStatesError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error && typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : '';
  const message = 'message' in error && typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message
    : '';
  return code === 'PGRST205' || code === '42P01' || message.includes('metric_actor_states');
};

export const createSupabaseMemeImageRepository = (): MemeImageRepository => {
  const supabase = getSupabaseAdminClient();

  return {
    async listMine(userId) {
      const { data, error } = await supabase
        .from('meme_images')
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at, users!meme_images_owner_id_fkey(display_name)')
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as MemeImageRow[];
      return rows.map((row) => toRecord(row, extractDisplayName(row.users)));
    },

    async getMineById(userId, imageId) {
      const { data, error } = await supabase
        .from('meme_images')
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at, users!meme_images_owner_id_fkey(display_name)')
        .eq('id', imageId)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const row = data as MemeImageRow;
      return toRecord(row, extractDisplayName(row.users));
    },

    async listPublic(limit, templateId) {
      let query = supabase
        .from('meme_images')
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at, users!meme_images_owner_id_fkey(display_name)')
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      const { data, error } = await query.limit(limit);

      if (error) throw error;
      const rows = (data ?? []) as MemeImageRow[];
      return rows.map((row) => toRecord(row, extractDisplayName(row.users)));
    },

    async getPublicByShareSlug(shareSlug) {
      const { data, error } = await supabase
        .from('meme_images')
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at, users!meme_images_owner_id_fkey(display_name)')
        .eq('share_slug', shareSlug)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const row = data as MemeImageRow;
      return toRecord(row, extractDisplayName(row.users));
    },

    async getLikeStateByShareSlug(shareSlug, actorKey) {
      const safeActorKey = actorKey.trim();
      if (!safeActorKey) return false;

      const { data: imageRow, error: imageError } = await supabase
        .from('meme_images')
        .select('id')
        .eq('share_slug', shareSlug)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .maybeSingle();
      if (imageError) throw imageError;
      if (!imageRow?.id) return null;

      const { data: metricRow, error: metricError } = await supabase
        .from('metric_actor_states')
        .select('liked_at')
        .eq('resource_type', 'remix')
        .eq('resource_id', imageRow.id)
        .eq('actor_key', safeActorKey)
        .maybeSingle();
      if (metricError) {
        if (isMissingMetricActorStatesError(metricError)) return false;
        throw metricError;
      }
      return Boolean(metricRow?.liked_at);
    },

    async incrementViewCountByShareSlug(shareSlug, actorKey) {
      const { data, error } = await supabase.rpc('increment_meme_image_view_count_dedup', {
        p_share_slug: shareSlug,
        p_actor_key: actorKey
      });

      if (error) throw error;
      if (data === null || data === undefined) return null;
      const next = Number(data);
      return Number.isFinite(next) ? next : null;
    },

    async toggleLikeByShareSlug(shareSlug, actorKey) {
      const { data, error } = await supabase.rpc('toggle_meme_image_like_count', {
        p_share_slug: shareSlug,
        p_actor_key: actorKey
      });

      if (!error) {
        if (data === null || data === undefined) return null;
        const parsed = parseToggleLikeResult(data);
        if (!parsed) throw new Error('Invalid toggle remix like RPC response.');
        return parsed;
      }

      if (!isMissingToggleLikeRpcError(error)) throw error;

      const { data: existing, error: existingError } = await supabase
        .from('meme_images')
        .select('id, like_count')
        .eq('share_slug', shareSlug)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return null;

      const safeActorKey = actorKey.trim();
      if (!safeActorKey) {
        const nextLikeCount = Math.max(0, Number(existing.like_count ?? 0) + 1);
        const { data: updated, error: updateError } = await supabase
          .from('meme_images')
          .update({ like_count: nextLikeCount })
          .eq('id', existing.id)
          .is('deleted_at', null)
          .select('like_count')
          .maybeSingle();
        if (updateError) throw updateError;
        const likeCount = Number(updated?.like_count ?? nextLikeCount);
        return { likeCount: Number.isFinite(likeCount) ? likeCount : nextLikeCount, liked: true };
      }

      const { data: metricState, error: metricStateError } = await supabase
        .from('metric_actor_states')
        .select('liked_at')
        .eq('resource_type', 'remix')
        .eq('resource_id', existing.id)
        .eq('actor_key', safeActorKey)
        .maybeSingle();
      if (metricStateError && !isMissingMetricActorStatesError(metricStateError)) throw metricStateError;

      if (metricStateError && isMissingMetricActorStatesError(metricStateError)) {
        const nextLikeCount = Math.max(0, Number(existing.like_count ?? 0) + 1);
        const { data: updated, error: updateError } = await supabase
          .from('meme_images')
          .update({ like_count: nextLikeCount })
          .eq('id', existing.id)
          .is('deleted_at', null)
          .select('like_count')
          .maybeSingle();
        if (updateError) throw updateError;
        const fallbackLikeCount = Number(updated?.like_count ?? nextLikeCount);
        return { likeCount: Number.isFinite(fallbackLikeCount) ? fallbackLikeCount : nextLikeCount, liked: true };
      }

      const wasLiked = Boolean(metricState?.liked_at);

      const { error: metricUpsertError } = await supabase
        .from('metric_actor_states')
        .upsert({
          resource_type: 'remix',
          resource_id: existing.id,
          actor_key: safeActorKey,
          liked_at: wasLiked ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'resource_type,resource_id,actor_key'
        });
      if (metricUpsertError) throw metricUpsertError;

      const nextLikeCount = Math.max(0, Number(existing.like_count ?? 0) + (wasLiked ? -1 : 1));
      const { data: updated, error: updateError } = await supabase
        .from('meme_images')
        .update({ like_count: nextLikeCount })
        .eq('id', existing.id)
        .is('deleted_at', null)
        .select('like_count')
        .maybeSingle();
      if (updateError) throw updateError;

      const fallbackLikeCount = Number(updated?.like_count ?? nextLikeCount);
      return {
        likeCount: Number.isFinite(fallbackLikeCount) ? fallbackLikeCount : nextLikeCount,
        liked: !wasLiked
      };
    },

    async create(userId, input) {
      const payload = {
        owner_id: userId,
        template_id: input.templateId ?? null,
        title: input.title,
        description: input.description ? input.description : null,
        image_url: input.imageUrl as string,
        image_width: input.imageWidth ?? null,
        image_height: input.imageHeight ?? null,
        image_bytes: input.imageBytes ?? null,
        image_mime: input.imageMime ?? null,
        visibility: input.visibility ?? 'private',
        share_slug: generateShareSlug(),
        view_count: 0,
        like_count: 0
      };

      const { data, error } = await supabase
        .from('meme_images')
        .insert(payload)
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at, users!meme_images_owner_id_fkey(display_name)')
        .single();

      if (error) throw error;
      const row = data as MemeImageRow;
      return toRecord(row, extractDisplayName(row.users));
    },

    async update(userId, imageId, input) {
      const patch: Partial<{
        template_id: string | null;
        title: string;
        description: string | null;
        image_url: string;
        image_width: number | null;
        image_height: number | null;
        image_bytes: number | null;
        image_mime: string | null;
        visibility: 'private' | 'public';
        updated_at: string;
      }> = {};

      if (input.templateId !== undefined) patch.template_id = input.templateId;
      if (input.title !== undefined) patch.title = input.title;
      if (input.description !== undefined) patch.description = input.description ? input.description : null;
      if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
      if (input.imageWidth !== undefined) patch.image_width = input.imageWidth;
      if (input.imageHeight !== undefined) patch.image_height = input.imageHeight;
      if (input.imageBytes !== undefined) patch.image_bytes = input.imageBytes;
      if (input.imageMime !== undefined) patch.image_mime = input.imageMime;
      if (input.visibility !== undefined) patch.visibility = input.visibility;
      patch.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('meme_images')
        .update(patch)
        .eq('id', imageId)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at, users!meme_images_owner_id_fkey(display_name)')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Meme image not found.');

      const row = data as MemeImageRow;
      return toRecord(row, extractDisplayName(row.users));
    },

    async remove(userId, imageId) {
      const { error } = await supabase
        .from('meme_images')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', imageId)
        .eq('owner_id', userId)
        .is('deleted_at', null);

      if (error) throw error;
    }
  };
};
