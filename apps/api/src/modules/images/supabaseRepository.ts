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

    async incrementViewCountByShareSlug(shareSlug) {
      const { data, error } = await supabase.rpc('increment_meme_image_view_count', {
        p_share_slug: shareSlug
      });

      if (error) throw error;
      if (data === null || data === undefined) return null;
      const next = Number(data);
      return Number.isFinite(next) ? next : null;
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
