import { randomBytes } from 'node:crypto';
import { getSupabaseAdminClient } from '../../lib/supabaseAdmin.js';
import type { CreateTemplateInput, UpdateTemplateInput } from '../../types/template.js';
import type { TemplateRecord, TemplateRepository } from './repository.js';

type TemplateRow = {
  id: string;
  owner_id: string;
  users?: {
    display_name: string | null;
  } | Array<{
    display_name: string | null;
  }> | null;
  title: string;
  description: string | null;
  content?: Record<string, unknown>;
  view_count: number | null;
  like_count: number | null;
  visibility: 'private' | 'public';
  share_slug: string;
  created_at: string;
  updated_at: string;
};

const resolveBackgroundSrc = (content?: Record<string, unknown>) => {
  const objects = Array.isArray(content?.objects) ? (content.objects as unknown[]) : [];
  for (const candidate of objects) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const obj = candidate as Record<string, unknown>;
    if (obj.type !== 'image') continue;
    const src = typeof obj.src === 'string' ? obj.src.trim() : '';
    if (!src) continue;
    if (obj.name === 'background') return src;
  }
  for (const candidate of objects) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const obj = candidate as Record<string, unknown>;
    if (obj.type !== 'image') continue;
    const src = typeof obj.src === 'string' ? obj.src.trim() : '';
    if (src) return src;
  }
  return undefined;
};

const toRecord = (
  row: TemplateRow,
  ownerDisplayName?: string | null,
  options?: { includeContent?: boolean }
): TemplateRecord => ({
  id: row.id,
  ownerId: row.owner_id,
  ownerDisplayName: ownerDisplayName ?? undefined,
  title: row.title,
  description: row.description ?? undefined,
  content: options?.includeContent === false ? {} : (row.content ?? {}),
  thumbnailUrl: resolveBackgroundSrc(row.content),
  viewCount: row.view_count ?? 0,
  likeCount: row.like_count ?? 0,
  visibility: row.visibility,
  shareSlug: row.share_slug,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const extractDisplayName = (users: TemplateRow['users']) => {
  if (!users) return undefined;
  if (Array.isArray(users)) return users[0]?.display_name ?? undefined;
  return users.display_name ?? undefined;
};

const generateShareSlug = () => `tmpl_${randomBytes(6).toString('base64url')}`;

export const createSupabaseTemplateRepository = (): TemplateRepository => {
  const supabase = getSupabaseAdminClient();
  return {
    async listMine(userId) {
      const { data, error } = await supabase
        .from('templates')
        .select('id, owner_id, title, description, content, view_count, like_count, visibility, share_slug, created_at, updated_at, users!templates_owner_id_fkey(display_name)')
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as TemplateRow[];
      return rows.map((row) => toRecord(row, extractDisplayName(row.users), { includeContent: false }));
    },

    async getMineById(userId, templateId) {
      const { data, error } = await supabase
        .from('templates')
        .select('id, owner_id, title, description, content, view_count, like_count, visibility, share_slug, created_at, updated_at, users!templates_owner_id_fkey(display_name)')
        .eq('id', templateId)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const row = data as TemplateRow;
      return toRecord(row, extractDisplayName(row.users));
    },

    async listPublic(limit) {
      const { data, error } = await supabase
        .from('templates')
        .select('id, owner_id, title, description, content, view_count, like_count, visibility, share_slug, created_at, updated_at, users!templates_owner_id_fkey(display_name)')
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      const rows = (data ?? []) as TemplateRow[];
      return rows.map((row) => toRecord(row, extractDisplayName(row.users), { includeContent: false }));
    },

    async getPublicDetailByShareSlug(shareSlug) {
      const { data, error } = await supabase
        .from('templates')
        .select('id, owner_id, title, description, content, view_count, like_count, visibility, share_slug, created_at, updated_at, users!templates_owner_id_fkey(display_name)')
        .eq('share_slug', shareSlug)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const row = data as TemplateRow;
      return toRecord(row, extractDisplayName(row.users), { includeContent: false });
    },

    async getPublicByShareSlug(shareSlug) {
      const { data, error } = await supabase
        .from('templates')
        .select('id, owner_id, title, description, content, view_count, like_count, visibility, share_slug, created_at, updated_at, users!templates_owner_id_fkey(display_name)')
        .eq('share_slug', shareSlug)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const row = data as TemplateRow;
      return toRecord(row, extractDisplayName(row.users));
    },

    async incrementViewCountByShareSlug(shareSlug) {
      const { data, error } = await supabase.rpc('increment_template_view_count', {
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
        title: input.title,
        description: input.description ? input.description : null,
        content: input.content,
        view_count: 0,
        like_count: 0,
        visibility: input.visibility ?? 'private',
        share_slug: generateShareSlug()
      };

      const { data, error } = await supabase
        .from('templates')
        .insert(payload)
        .select('id, owner_id, title, description, content, view_count, like_count, visibility, share_slug, created_at, updated_at, users!templates_owner_id_fkey(display_name)')
        .single();

      if (error) throw error;
      const row = data as TemplateRow;
      return toRecord(row, extractDisplayName(row.users));
    },

    async update(userId, templateId, input) {
      const patch: Partial<{
        title: string;
        description: string | null;
        content: Record<string, unknown>;
        visibility: 'private' | 'public';
        updated_at: string;
      }> = {};

      if (input.title !== undefined) patch.title = input.title;
      if (input.description !== undefined) patch.description = input.description ? input.description : null;
      if (input.content !== undefined) patch.content = input.content;
      if (input.visibility !== undefined) patch.visibility = input.visibility;
      patch.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('templates')
        .update(patch)
        .eq('id', templateId)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .select('id, owner_id, title, description, content, view_count, like_count, visibility, share_slug, created_at, updated_at, users!templates_owner_id_fkey(display_name)')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Template not found.');
      }
      const row = data as TemplateRow;
      return toRecord(row, extractDisplayName(row.users));
    },

    async remove(userId, templateId) {
      const { error } = await supabase
        .from('templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', templateId)
        .eq('owner_id', userId)
        .is('deleted_at', null);

      if (error) throw error;
    }
  };
};
