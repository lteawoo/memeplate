import { randomBytes } from 'node:crypto';
import { getSupabaseAdminClient } from '../../lib/supabaseAdmin.js';
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplatePublicPeriod,
  TemplatePublicSortBy
} from '../../types/template.js';
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

const getPeriodCutoffIso = (period: TemplatePublicPeriod) => {
  if (period === 'all') return null;
  const now = Date.now();
  const cutoffMsByPeriod: Record<Exclude<TemplatePublicPeriod, 'all'>, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000
  };
  return new Date(now - cutoffMsByPeriod[period]).toISOString();
};

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
  return code === 'PGRST202' || message.includes('toggle_template_like_count');
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

    async countRemixesByTemplateId(templateId) {
      const { count, error } = await supabase
        .from('meme_images')
        .select('id', { count: 'exact', head: true })
        .eq('template_id', templateId)
        .is('deleted_at', null);

      if (error) throw error;
      return count ?? 0;
    },

    async listPublic({ limit, sortBy, period }) {
      const cutoffIso = getPeriodCutoffIso(period);
      let query = supabase
        .from('templates')
        .select('id, owner_id, title, description, content, view_count, like_count, visibility, share_slug, created_at, updated_at, users!templates_owner_id_fkey(display_name)')
        .eq('visibility', 'public')
        .is('deleted_at', null);
      if (cutoffIso) {
        query = query.gte('created_at', cutoffIso);
      }
      let orderedQuery = query.order('updated_at', { ascending: false });
      if (sortBy === 'likes') {
        orderedQuery = query
          .order('like_count', { ascending: false })
          .order('view_count', { ascending: false })
          .order('updated_at', { ascending: false });
      } else if (sortBy === 'views') {
        orderedQuery = query
          .order('view_count', { ascending: false })
          .order('like_count', { ascending: false })
          .order('updated_at', { ascending: false });
      }
      orderedQuery = orderedQuery.limit(limit);
      const { data, error } = await orderedQuery;

      if (error) throw error;
      const rows = (data ?? []) as TemplateRow[];
      return rows.map((row) => toRecord(row, extractDisplayName(row.users), { includeContent: false }));
    },

    async getDetailByShareSlug(shareSlug, viewerUserId) {
      const { data, error } = await supabase
        .from('templates')
        .select('id, owner_id, title, description, content, view_count, like_count, visibility, share_slug, created_at, updated_at, users!templates_owner_id_fkey(display_name)')
        .eq('share_slug', shareSlug)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const row = data as TemplateRow;

      const canView = row.visibility === 'public' || (typeof viewerUserId === 'string' && viewerUserId.length > 0 && row.owner_id === viewerUserId);
      if (!canView) {
        return null;
      }

      return toRecord(row, extractDisplayName(row.users), { includeContent: false });
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

    async getLikeStateByShareSlug(shareSlug, actorKey) {
      const safeActorKey = actorKey.trim();
      if (!safeActorKey) return false;

      const { data: templateRow, error: templateError } = await supabase
        .from('templates')
        .select('id')
        .eq('share_slug', shareSlug)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .maybeSingle();
      if (templateError) throw templateError;
      if (!templateRow?.id) return null;

      const { data: metricRow, error: metricError } = await supabase
        .from('metric_actor_states')
        .select('liked_at')
        .eq('resource_type', 'template')
        .eq('resource_id', templateRow.id)
        .eq('actor_key', safeActorKey)
        .maybeSingle();
      if (metricError) {
        if (isMissingMetricActorStatesError(metricError)) return false;
        throw metricError;
      }
      return Boolean(metricRow?.liked_at);
    },

    async incrementViewCountByShareSlug(shareSlug, actorKey) {
      const { data, error } = await supabase.rpc('increment_template_view_count_dedup', {
        p_share_slug: shareSlug,
        p_actor_key: actorKey
      });

      if (error) throw error;
      if (data === null || data === undefined) return null;
      const next = Number(data);
      return Number.isFinite(next) ? next : null;
    },

    async toggleLikeByShareSlug(shareSlug, actorKey) {
      const { data, error } = await supabase.rpc('toggle_template_like_count', {
        p_share_slug: shareSlug,
        p_actor_key: actorKey
      });

      if (!error) {
        if (data === null || data === undefined) return null;
        const parsed = parseToggleLikeResult(data);
        if (!parsed) throw new Error('Invalid toggle template like RPC response.');
        return parsed;
      }

      if (!isMissingToggleLikeRpcError(error)) throw error;

      const { data: existing, error: existingError } = await supabase
        .from('templates')
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
          .from('templates')
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
        .eq('resource_type', 'template')
        .eq('resource_id', existing.id)
        .eq('actor_key', safeActorKey)
        .maybeSingle();
      if (metricStateError && !isMissingMetricActorStatesError(metricStateError)) throw metricStateError;

      if (metricStateError && isMissingMetricActorStatesError(metricStateError)) {
        const nextLikeCount = Math.max(0, Number(existing.like_count ?? 0) + 1);
        const { data: updated, error: updateError } = await supabase
          .from('templates')
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
          resource_type: 'template',
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
        .from('templates')
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
