import { randomBytes } from 'node:crypto';
import { getSupabaseAdminClient } from '../../lib/supabaseAdmin.js';
import type { CreateTemplateInput, UpdateTemplateInput } from '../../types/template.js';
import type { TemplateRecord, TemplateRepository } from './repository.js';

type TemplateRow = {
  id: string;
  owner_id: string;
  title: string;
  content?: Record<string, unknown>;
  thumbnail_url: string | null;
  visibility: 'private' | 'public';
  share_slug: string;
  created_at: string;
  updated_at: string;
};

type UserRow = {
  id: string;
  display_name: string | null;
};

const toRecord = (row: TemplateRow, ownerDisplayName?: string | null): TemplateRecord => ({
  id: row.id,
  ownerId: row.owner_id,
  ownerDisplayName: ownerDisplayName ?? undefined,
  title: row.title,
  content: row.content ?? {},
  thumbnailUrl: row.thumbnail_url ?? undefined,
  visibility: row.visibility,
  shareSlug: row.share_slug,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const generateShareSlug = () => `tmpl_${randomBytes(6).toString('base64url')}`;

export const createSupabaseTemplateRepository = (): TemplateRepository => {
  const supabase = getSupabaseAdminClient();
  const resolveOwnerDisplayNameMap = async (ownerIds: string[]) => {
    if (ownerIds.length === 0) {
      return new Map<string, string | null>();
    }

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
        .from('templates')
        .select('id, owner_id, title, thumbnail_url, visibility, share_slug, created_at, updated_at')
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as TemplateRow[];
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap(
        Array.from(new Set(rows.map((row) => row.owner_id)))
      );
      return rows.map((row) => toRecord(row, ownerDisplayNameMap.get(row.owner_id)));
    },

    async getMineById(userId, templateId) {
      const { data, error } = await supabase
        .from('templates')
        .select('id, owner_id, title, content, thumbnail_url, visibility, share_slug, created_at, updated_at')
        .eq('id', templateId)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const row = data as TemplateRow;
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap([row.owner_id]);
      return toRecord(row, ownerDisplayNameMap.get(row.owner_id));
    },

    async listPublic(limit) {
      const { data, error } = await supabase
        .from('templates')
        .select('id, owner_id, title, thumbnail_url, visibility, share_slug, created_at, updated_at')
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      const rows = (data ?? []) as TemplateRow[];
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap(
        Array.from(new Set(rows.map((row) => row.owner_id)))
      );
      return rows.map((row) => toRecord(row, ownerDisplayNameMap.get(row.owner_id)));
    },

    async getPublicByShareSlug(shareSlug) {
      const { data, error } = await supabase
        .from('templates')
        .select('id, owner_id, title, content, thumbnail_url, visibility, share_slug, created_at, updated_at')
        .eq('share_slug', shareSlug)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const row = data as TemplateRow;
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap([row.owner_id]);
      return toRecord(row, ownerDisplayNameMap.get(row.owner_id));
    },

    async create(userId, input) {
      const payload = {
        owner_id: userId,
        title: input.title,
        content: input.content,
        thumbnail_url: input.thumbnailUrl ?? null,
        visibility: input.visibility ?? 'private',
        share_slug: generateShareSlug()
      };

      const { data, error } = await supabase
        .from('templates')
        .insert(payload)
        .select('id, owner_id, title, content, thumbnail_url, visibility, share_slug, created_at, updated_at')
        .single();

      if (error) throw error;
      const row = data as TemplateRow;
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap([row.owner_id]);
      return toRecord(row, ownerDisplayNameMap.get(row.owner_id));
    },

    async update(userId, templateId, input) {
      const patch: Partial<{
        title: string;
        content: Record<string, unknown>;
        thumbnail_url: string | null;
        visibility: 'private' | 'public';
        updated_at: string;
      }> = {};

      if (input.title !== undefined) patch.title = input.title;
      if (input.content !== undefined) patch.content = input.content;
      if (input.thumbnailUrl !== undefined) patch.thumbnail_url = input.thumbnailUrl ?? null;
      if (input.visibility !== undefined) patch.visibility = input.visibility;
      patch.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('templates')
        .update(patch)
        .eq('id', templateId)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .select('id, owner_id, title, content, thumbnail_url, visibility, share_slug, created_at, updated_at')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Template not found.');
      }
      const row = data as TemplateRow;
      const ownerDisplayNameMap = await resolveOwnerDisplayNameMap([row.owner_id]);
      return toRecord(row, ownerDisplayNameMap.get(row.owner_id));
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
