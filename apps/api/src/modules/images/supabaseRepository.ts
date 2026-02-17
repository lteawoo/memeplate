import { randomBytes } from 'node:crypto';
import { getSupabaseAdminClient } from '../../lib/supabaseAdmin.js';
import type { CreateMemeImageInput, UpdateMemeImageInput } from '../../types/image.js';
import type { MemeImageRecord, MemeImageRepository } from './repository.js';

type MemeImageRow = {
  id: string;
  owner_id: string;
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

type UserRow = {
  id: string;
  display_name: string | null;
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

const generateShareSlug = () => `img_${randomBytes(6).toString('base64url')}`;

export const createSupabaseMemeImageRepository = (): MemeImageRepository => {
  const supabase = getSupabaseAdminClient();

  const resolveOwnerDisplayNameMap = async (ownerIds: string[]) => {
    if (ownerIds.length === 0) return new Map<string, string | null>();

    const { data, error } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', ownerIds);

    if (error || !data) {
      return new Map<string, string | null>();
    }
    return new Map((data as UserRow[]).map((row) => [row.id, row.display_name]));
  };

  return {
    async listMine(userId) {
      const { data, error } = await supabase
        .from('meme_images')
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at')
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as MemeImageRow[];
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap(
        Array.from(new Set(rows.map((row) => row.owner_id)))
      );
      return rows.map((row) => toRecord(row, ownerDisplayNameMap.get(row.owner_id)));
    },

    async getMineById(userId, imageId) {
      const { data, error } = await supabase
        .from('meme_images')
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at')
        .eq('id', imageId)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const row = data as MemeImageRow;
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap([row.owner_id]);
      return toRecord(row, ownerDisplayNameMap.get(row.owner_id));
    },

    async listPublic(limit, templateId) {
      let query = supabase
        .from('meme_images')
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at')
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      const { data, error } = await query.limit(limit);

      if (error) throw error;
      const rows = (data ?? []) as MemeImageRow[];
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap(
        Array.from(new Set(rows.map((row) => row.owner_id)))
      );
      return rows.map((row) => toRecord(row, ownerDisplayNameMap.get(row.owner_id)));
    },

    async getPublicByShareSlug(shareSlug) {
      const { data, error } = await supabase
        .from('meme_images')
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at')
        .eq('share_slug', shareSlug)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const row = data as MemeImageRow;
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap([row.owner_id]);
      return toRecord(row, ownerDisplayNameMap.get(row.owner_id));
    },

    async incrementViewCountByShareSlug(shareSlug) {
      const { data: target, error: targetError } = await supabase
        .from('meme_images')
        .select('id, view_count')
        .eq('share_slug', shareSlug)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .maybeSingle<{ id: string; view_count: number | null }>();

      if (targetError) throw targetError;
      if (!target) return null;

      const nextViewCount = (target.view_count ?? 0) + 1;
      const { data: updated, error: updateError } = await supabase
        .from('meme_images')
        .update({ view_count: nextViewCount })
        .eq('id', target.id)
        .select('view_count')
        .single<{ view_count: number | null }>();

      if (updateError) throw updateError;
      return updated.view_count ?? nextViewCount;
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
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at')
        .single();

      if (error) throw error;
      const row = data as MemeImageRow;
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap([row.owner_id]);
      return toRecord(row, ownerDisplayNameMap.get(row.owner_id));
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
        .select('id, owner_id, template_id, title, description, image_url, image_width, image_height, image_bytes, image_mime, visibility, share_slug, view_count, like_count, created_at, updated_at')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Meme image not found.');

      const row = data as MemeImageRow;
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap([row.owner_id]);
      return toRecord(row, ownerDisplayNameMap.get(row.owner_id));
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
