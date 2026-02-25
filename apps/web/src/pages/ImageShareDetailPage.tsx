import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiCommentOutline, mdiEyeOutline, mdiHeartOutline } from '@mdi/js';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/apiFetch';
import { buildLoginPath, getPathWithSearchAndHash } from '@/lib/loginNavigation';
import MainHeader from '../components/layout/MainHeader';
import MainFooter from '../components/layout/MainFooter';
import PageContainer from '../components/layout/PageContainer';
import PreviewFrame from '../components/PreviewFrame';
import ThumbnailCard from '../components/ThumbnailCard';
import type {
  MemeImageRecord,
  MemeImagesResponse,
  MemeImageResponse,
  RemixCommentCreateResponse,
  RemixCommentRecord,
  SourceTemplateSummary
} from '../types/image';
import { useAuthStore } from '../stores/authStore';

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const COMMENT_BODY_MAX_LENGTH = 500;
const COMMENT_LIST_LIMIT = 100;
const RELATED_REMIXES_LIMIT = 12;

type ReplyTarget = {
  commentId: string;
  authorName: string;
};

const SidebarThumbnailSkeleton: React.FC = () => (
  <div className="overflow-hidden rounded-xl border border-transparent bg-transparent shadow-none">
    <div className="thumb-card-surface h-52 w-full bg-transparent px-4">
      <div className="thumb-card-media-surface relative flex h-full items-center justify-center overflow-hidden rounded-lg bg-transparent">
        <Skeleton className="absolute inset-0 rounded-lg bg-border/70" />
      </div>
    </div>
    <div className="space-y-2 px-4 pt-3 pb-4">
      <Skeleton className="h-4 w-full rounded bg-border/80" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 flex-1 rounded bg-border/70" />
        <Skeleton className="h-4 flex-1 rounded bg-border/70" />
      </div>
    </div>
  </div>
);

const ImageShareDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const authUser = useAuthStore((state) => state.user);
  const authInitialized = useAuthStore((state) => state.initialized);
  const syncSession = useAuthStore((state) => state.syncSession);
  const viewedSlugRef = React.useRef<string | null>(null);
  const [image, setImage] = React.useState<MemeImageRecord | null>(null);
  const [isMainImageLoaded, setIsMainImageLoaded] = React.useState(false);
  const [isMainImageError, setIsMainImageError] = React.useState(false);
  const mainImageRef = React.useRef<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isSavingMeta, setIsSavingMeta] = React.useState(false);
  const [isLikingImage, setIsLikingImage] = React.useState(false);
  const imageLikeLockRef = React.useRef(false);
  const imageLikeRequestSeqRef = React.useRef(0);
  const imageLikeAbortRef = React.useRef<AbortController | null>(null);
  const detailRequestSeqRef = React.useRef(0);
  const detailAbortRef = React.useRef<AbortController | null>(null);
  const [likedImageByMe, setLikedImageByMe] = React.useState(false);
  const [sourceTemplate, setSourceTemplate] = React.useState<SourceTemplateSummary | null>(null);
  const [relatedRemixes, setRelatedRemixes] = React.useState<MemeImageRecord[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = React.useState(false);
  const [isRelatedLoaded, setIsRelatedLoaded] = React.useState(false);
  const [relatedError, setRelatedError] = React.useState<string | null>(null);
  const [comments, setComments] = React.useState<RemixCommentRecord[]>([]);
  const [commentsTotalCount, setCommentsTotalCount] = React.useState(0);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [activeReplyTarget, setActiveReplyTarget] = React.useState<ReplyTarget | null>(null);
  const [replyDraft, setReplyDraft] = React.useState('');
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = React.useState(false);
  const commentsSectionRef = React.useRef<HTMLElement | null>(null);
  const isOwner = Boolean(authInitialized && authUser?.id && image?.ownerId && authUser.id === image.ownerId);
  const displayCommentCount = React.useMemo(() => {
    if (commentsTotalCount > 0) return commentsTotalCount;
    if (comments.length > 0) return comments.length;
    return image?.commentCount ?? 0;
  }, [comments.length, commentsTotalCount, image?.commentCount]);
  const visibleRelatedRemixes = React.useMemo(
    () => relatedRemixes.slice(0, 6),
    [relatedRemixes]
  );

  const orderedComments = React.useMemo(() => {
    const next = [...comments];
    next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return next;
  }, [comments]);

  const threadedComments = React.useMemo(() => {
    const topLevel = orderedComments.filter((comment) => !comment.rootCommentId);
    topLevel.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const topLevelById = new Set(topLevel.map((comment) => comment.id));

    const repliesByRoot = new Map<string, RemixCommentRecord[]>();
    const orphanReplies: RemixCommentRecord[] = [];
    for (const comment of orderedComments) {
      if (!comment.rootCommentId) continue;
      if (!topLevelById.has(comment.rootCommentId)) {
        orphanReplies.push(comment);
        continue;
      }
      const bucket = repliesByRoot.get(comment.rootCommentId) ?? [];
      bucket.push(comment);
      repliesByRoot.set(comment.rootCommentId, bucket);
    }

    return { topLevel, repliesByRoot, orphanReplies };
  }, [orderedComments]);

  React.useEffect(() => {
    if (!authInitialized) {
      void syncSession();
    }
  }, [authInitialized, syncSession]);

  React.useEffect(() => {
    const requestSeq = detailRequestSeqRef.current + 1;
    detailRequestSeqRef.current = requestSeq;
    const controller = new AbortController();
    detailAbortRef.current?.abort();
    detailAbortRef.current = controller;

    const load = async () => {
      if (!shareSlug) {
        if (detailRequestSeqRef.current !== requestSeq) return;
        setError('잘못된 공유 링크입니다.');
        return;
      }
      try {
        const res = await fetch(`/api/v1/remixes/s/${shareSlug}?commentsLimit=${COMMENT_LIST_LIMIT}`, {
          signal: controller.signal
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || '이미지를 불러오지 못했습니다.');
        }
        const payload = (await res.json()) as MemeImageResponse;
        if (detailRequestSeqRef.current !== requestSeq) return;
        setImage(payload.image);
        setLikedImageByMe(payload.likedByMe === true);
        setSourceTemplate(payload.sourceTemplate ?? null);
        const nextComments = Array.isArray(payload.comments) ? payload.comments : [];
        setComments(nextComments);
        setCommentsTotalCount(
          typeof payload.commentsTotalCount === 'number' ? payload.commentsTotalCount : nextComments.length
        );
      } catch (err) {
        if (detailRequestSeqRef.current !== requestSeq) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : '이미지를 불러오지 못했습니다.');
      } finally {
        if (detailAbortRef.current === controller) {
          detailAbortRef.current = null;
        }
        if (detailRequestSeqRef.current === requestSeq) {
          setIsLoading(false);
        }
      }
    };
    setIsLoading(true);
    setError(null);
    setImage(null);
    setIsLikingImage(false);
    imageLikeAbortRef.current?.abort();
    imageLikeAbortRef.current = null;
    imageLikeRequestSeqRef.current += 1;
    imageLikeLockRef.current = false;
    setLikedImageByMe(false);
    setSourceTemplate(null);
    setRelatedRemixes([]);
    setIsRelatedLoading(false);
    setIsRelatedLoaded(false);
    setRelatedError(null);
    setComments([]);
    setCommentsTotalCount(0);
    setCommentDraft('');
    setActiveReplyTarget(null);
    setReplyDraft('');
    setIsSubmittingComment(false);
    setIsSubmittingReply(false);
    void load();

    return () => {
      controller.abort();
      if (detailAbortRef.current === controller) {
        detailAbortRef.current = null;
      }
    };
  }, [shareSlug]);

  React.useEffect(() => {
    return () => {
      detailAbortRef.current?.abort();
      detailAbortRef.current = null;
      imageLikeAbortRef.current?.abort();
      imageLikeAbortRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    setIsMainImageError(false);
    const imageEl = mainImageRef.current;
    if (imageEl && imageEl.complete && imageEl.naturalWidth > 0) {
      setIsMainImageLoaded(true);
      return;
    }
    setIsMainImageLoaded(false);
  }, [image?.imageUrl]);

  React.useEffect(() => {
    setEditTitle(image?.title ?? '');
    setEditDescription(image?.description ?? '');
  }, [image?.id, image?.title, image?.description]);

  React.useEffect(() => {
    if (!shareSlug || !image || viewedSlugRef.current === shareSlug) return;

    viewedSlugRef.current = shareSlug;
    const incrementView = async () => {
      try {
        const res = await fetch(`/api/v1/remixes/s/${shareSlug}/view`, { method: 'POST' });
        if (!res.ok) return;
        const payload = (await res.json().catch(() => ({}))) as { viewCount?: number };
        if (typeof payload.viewCount !== 'number') return;
        setImage((prev) => (prev ? { ...prev, viewCount: payload.viewCount } : prev));
      } catch {
        // 조회수 증가 실패는 상세 화면 흐름을 막지 않는다.
      }
    };
    void incrementView();
  }, [shareSlug, image]);

  React.useEffect(() => {
    const templateId = image?.templateId;
    const currentShareSlug = image?.shareSlug;
    if (!templateId) {
      setRelatedRemixes([]);
      setRelatedError(null);
      setIsRelatedLoading(false);
      setIsRelatedLoaded(true);
      return;
    }

    let cancelled = false;
    const loadRelatedRemixes = async () => {
      setIsRelatedLoading(true);
      setIsRelatedLoaded(false);
      setRelatedError(null);
      try {
        const res = await fetch(`/api/v1/remixes/public?limit=${RELATED_REMIXES_LIMIT}&templateId=${templateId}`);
        if (!res.ok) {
          throw new Error('다른 리믹스를 불러오지 못했습니다.');
        }
        const payload = (await res.json()) as MemeImagesResponse;
        if (cancelled) return;
        const next = Array.isArray(payload.images) ? payload.images : [];
        setRelatedRemixes(
          next.filter((candidate) => candidate.shareSlug && candidate.shareSlug !== currentShareSlug)
        );
      } catch (err) {
        if (cancelled) return;
        setRelatedError(err instanceof Error ? err.message : '다른 리믹스를 불러오지 못했습니다.');
        setRelatedRemixes([]);
      } finally {
        if (!cancelled) {
          setIsRelatedLoading(false);
          setIsRelatedLoaded(true);
        }
      }
    };
    void loadRelatedRemixes();

    return () => {
      cancelled = true;
    };
  }, [image?.shareSlug, image?.templateId]);

  const handleLikeImage = React.useCallback(async () => {
    if (!image?.shareSlug || image.visibility !== 'public' || imageLikeLockRef.current) return;

    const targetShareSlug = image.shareSlug;
    const requestSeq = imageLikeRequestSeqRef.current + 1;
    imageLikeRequestSeqRef.current = requestSeq;
    const controller = new AbortController();
    imageLikeAbortRef.current?.abort();
    imageLikeAbortRef.current = controller;
    imageLikeLockRef.current = true;
    setIsLikingImage(true);
    try {
      const res = await fetch(`/api/v1/remixes/s/${targetShareSlug}/like`, {
        method: 'POST',
        signal: controller.signal,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '좋아요 처리에 실패했습니다.');
      }
      const payload = (await res.json().catch(() => ({}))) as { likeCount?: number; liked?: boolean };
      if (imageLikeRequestSeqRef.current !== requestSeq) return;
      if (typeof payload.likeCount === 'number') {
        setImage((prev) => (
          prev && prev.shareSlug === targetShareSlug ? { ...prev, likeCount: payload.likeCount } : prev
        ));
      } else {
        setImage((prev) => (
          prev && prev.shareSlug === targetShareSlug
            ? { ...prev, likeCount: Math.max(0, (prev.likeCount ?? 0) + (likedImageByMe ? -1 : 1)) }
            : prev
        ));
      }
      if (typeof payload.liked === 'boolean') {
        setLikedImageByMe(payload.liked);
      } else {
        setLikedImageByMe((prev) => !prev);
      }
    } catch (err) {
      if (imageLikeRequestSeqRef.current !== requestSeq) {
        return;
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      toast.error(err instanceof Error ? err.message : '좋아요 처리에 실패했습니다.');
    } finally {
      if (imageLikeAbortRef.current === controller) {
        imageLikeAbortRef.current = null;
      }
      if (imageLikeRequestSeqRef.current === requestSeq) {
        imageLikeLockRef.current = false;
        setIsLikingImage(false);
      }
    }
  }, [image?.shareSlug, image?.visibility, likedImageByMe]);

  const handleScrollToComments = React.useCallback(() => {
    commentsSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, []);

  const handleOpenSourceTemplate = React.useCallback(() => {
    if (!sourceTemplate?.shareSlug) return;
    navigate(`/memeplates/s/${sourceTemplate.shareSlug}`);
  }, [navigate, sourceTemplate?.shareSlug]);

  const handleStartRemixFromSource = React.useCallback(async () => {
    if (!sourceTemplate?.shareSlug) return;
    const nextPath = `/create?shareSlug=${sourceTemplate.shareSlug}`;
    let nextUser = authUser;
    if (!nextUser) {
      await syncSession();
      nextUser = useAuthStore.getState().user;
    }
    if (!nextUser) {
      navigate(buildLoginPath(nextPath));
      return;
    }
    navigate(nextPath);
  }, [authUser, navigate, sourceTemplate?.shareSlug, syncSession]);

  const ensureSignedInUser = React.useCallback(async () => {
    let nextUser = authUser;
    if (!nextUser) {
      await syncSession();
      nextUser = useAuthStore.getState().user;
    }

    if (!nextUser) {
      navigate(buildLoginPath(getPathWithSearchAndHash(location)));
      return null;
    }
    return nextUser;
  }, [authUser, location, navigate, syncSession]);

  const handleSubmitComment = React.useCallback(async () => {
    if (!shareSlug || !image?.id || isSubmittingComment || isSubmittingReply) return;

    const nextBody = commentDraft.trim();
    if (!nextBody) {
      toast.error('댓글 내용을 입력하세요.');
      return;
    }

    if (nextBody.length > COMMENT_BODY_MAX_LENGTH) {
      toast.error(`댓글은 최대 ${COMMENT_BODY_MAX_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }

    const nextUser = await ensureSignedInUser();
    if (!nextUser) return;

    setIsSubmittingComment(true);
    try {
      const res = await apiFetch(`/api/v1/remixes/s/${shareSlug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: nextBody })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '댓글 등록에 실패했습니다.');
      }
      const payload = (await res.json()) as RemixCommentCreateResponse;
      if (!payload.comment) throw new Error('댓글 등록 결과가 올바르지 않습니다.');

      setComments((prev) => [payload.comment, ...prev]);
      setCommentsTotalCount((prev) => (
        typeof payload.totalCount === 'number' ? payload.totalCount : prev + 1
      ));
      setCommentDraft('');
      toast.success('댓글을 등록했습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '댓글 등록에 실패했습니다.');
    } finally {
      setIsSubmittingComment(false);
    }
  }, [
    commentDraft,
    ensureSignedInUser,
    image?.id,
    isSubmittingReply,
    isSubmittingComment,
    shareSlug,
  ]);

  const handleSubmitInlineReply = React.useCallback(async () => {
    if (!shareSlug || !image?.id || !activeReplyTarget || isSubmittingReply || isSubmittingComment) return;

    const nextBody = replyDraft.trim();
    if (!nextBody) {
      toast.error('답글 내용을 입력하세요.');
      return;
    }

    if (nextBody.length > COMMENT_BODY_MAX_LENGTH) {
      toast.error(`댓글은 최대 ${COMMENT_BODY_MAX_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }

    const nextUser = await ensureSignedInUser();
    if (!nextUser) return;

    setIsSubmittingReply(true);
    try {
      const res = await apiFetch(`/api/v1/remixes/s/${shareSlug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: nextBody,
          replyToCommentId: activeReplyTarget.commentId
        })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '답글 등록에 실패했습니다.');
      }
      const payload = (await res.json()) as RemixCommentCreateResponse;
      if (!payload.comment) throw new Error('답글 등록 결과가 올바르지 않습니다.');

      setComments((prev) => [payload.comment, ...prev]);
      setCommentsTotalCount((prev) => (
        typeof payload.totalCount === 'number' ? payload.totalCount : prev + 1
      ));
      setReplyDraft('');
      setActiveReplyTarget(null);
      toast.success('답글을 등록했습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '답글 등록에 실패했습니다.');
    } finally {
      setIsSubmittingReply(false);
    }
  }, [
    activeReplyTarget,
    ensureSignedInUser,
    image?.id,
    isSubmittingComment,
    isSubmittingReply,
    replyDraft,
    shareSlug,
  ]);

  const handleStartReply = React.useCallback((comment: RemixCommentRecord) => {
    const authorName = comment.authorDisplayName || comment.authorId || '익명';
    setActiveReplyTarget({
      commentId: comment.id,
      authorName
    });
    setReplyDraft('');
  }, []);

  const handleCancelReply = React.useCallback(() => {
    setActiveReplyTarget(null);
    setReplyDraft('');
  }, []);

  const renderInlineReplyComposer = React.useCallback((targetCommentId: string) => {
    if (activeReplyTarget?.commentId !== targetCommentId) return null;

    return (
      <div className="mt-3 space-y-2 rounded-md border border-border/70 bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          {activeReplyTarget.authorName}님에게 답글
        </p>
        <Textarea
          value={replyDraft}
          maxLength={COMMENT_BODY_MAX_LENGTH}
          rows={3}
          className="border border-border bg-background"
          onChange={(event) => setReplyDraft(event.target.value)}
          placeholder="답글을 입력해 주세요."
          disabled={isSubmittingReply}
        />
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">
            {replyDraft.trim().length}/{COMMENT_BODY_MAX_LENGTH}
          </span>
          <Button type="button" size="sm" variant="ghost" disabled={isSubmittingReply} onClick={handleCancelReply}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSubmittingReply}
            onClick={() => { void handleSubmitInlineReply(); }}
          >
            {isSubmittingReply ? '등록 중...' : '등록'}
          </Button>
        </div>
      </div>
    );
  }, [
    activeReplyTarget?.authorName,
    activeReplyTarget?.commentId,
    handleCancelReply,
    handleSubmitInlineReply,
    isSubmittingReply,
    replyDraft
  ]);

  const handleSaveMeta = React.useCallback(async () => {
    if (!image || !isOwner) return false;

    const nextTitle = editTitle.trim();
    const nextDescription = editDescription.trim();
    if (!nextTitle) {
      toast.error('제목을 입력하세요.');
      return false;
    }

    setIsSavingMeta(true);
    try {
      const res = await apiFetch(`/api/v1/remixes/${image.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: nextTitle,
          description: nextDescription.length > 0 ? nextDescription : ''
        })
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '리믹스 정보 수정에 실패했습니다.');
      }

      const payload = (await res.json()) as MemeImageResponse;
      setImage(payload.image);
      setEditTitle(payload.image.title);
      setEditDescription(payload.image.description ?? '');
      toast.success('리믹스 정보를 수정했습니다.');
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '리믹스 정보 수정에 실패했습니다.');
      return false;
    } finally {
      setIsSavingMeta(false);
    }
  }, [editDescription, editTitle, image, isOwner]);

  const handleOpenEditDialog = React.useCallback(() => {
    if (!image || !isOwner) return;
    setEditTitle(image.title);
    setEditDescription(image.description ?? '');
    setIsEditDialogOpen(true);
  }, [image, isOwner]);

  const handleSaveMetaFromDialog = React.useCallback(async () => {
    const saved = await handleSaveMeta();
    if (saved) {
      setIsEditDialogOpen(false);
    }
  }, [handleSaveMeta]);

  const handleEditDialogOpenChange = React.useCallback((nextOpen: boolean) => {
    if (!nextOpen && isSavingMeta) return;
    setIsEditDialogOpen(nextOpen);
  }, [isSavingMeta]);

  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
            <aside className="order-2 rounded-2xl bg-card p-6 lg:order-1 lg:self-start">
              <Skeleton className="mb-3 h-5 w-28 rounded bg-border/70" />
              <div className="mb-3">
                <SidebarThumbnailSkeleton />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <Skeleton className="h-9 rounded bg-border/70" />
              </div>
              <Skeleton className="mt-8 mb-3 h-5 w-24 rounded bg-border/70" />
              <div className="space-y-3">
                {Array.from({ length: 2 }, (_, idx) => (
                  <SidebarThumbnailSkeleton key={idx} />
                ))}
              </div>
            </aside>
            <div className="order-1 rounded-2xl bg-card p-6 lg:order-2">
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                <PreviewFrame alt="공유 이미지 로딩" loadingPlaceholder contentClassName="h-[480px]" />
                <div className="space-y-4">
                  <Skeleton className="h-7 w-4/5 rounded bg-border/80" />
                  <Skeleton className="h-4 w-full rounded bg-border/70" />
                  <Skeleton className="h-4 w-3/4 rounded bg-border/70" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded bg-border/70" />
                    <Skeleton className="h-9 w-24 rounded bg-border/70" />
                  </div>
                  <div className="space-y-3 border-t border-border/70 pt-4">
                    {Array.from({ length: 6 }, (_, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3">
                        <Skeleton className="h-4 w-16 rounded bg-border/70" />
                        <Skeleton className="h-4 w-28 rounded bg-border/70" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <section className="mt-8 border-t border-border/70 pt-6">
                <Skeleton className="mb-4 h-6 w-20 rounded bg-border/70" />
                <Skeleton className="mb-2 h-24 w-full rounded bg-border/70" />
                <Skeleton className="h-9 w-20 rounded bg-border/70" />
              </section>
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>이미지 로딩 실패</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : image ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
            <aside className="order-2 rounded-2xl bg-card p-6 lg:order-1 lg:self-start">
              <section>
                <h3 className="mb-3 text-base font-semibold text-foreground">원본 밈플릿</h3>
                {sourceTemplate ? (
                  <div className="space-y-3">
                    <ThumbnailCard
                      imageUrl={sourceTemplate.thumbnailUrl}
                      title={sourceTemplate.title}
                      hoverable
                      hoverSurfaceOnly
                      fallbackText="원본 이미지 없음"
                      onClick={handleOpenSourceTemplate}
                    >
                      <div className="space-y-1">
                        <h4 className="line-clamp-1 text-sm font-semibold text-foreground">{sourceTemplate.title}</h4>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{sourceTemplate.ownerDisplayName || sourceTemplate.ownerId}</span>
                          <span className="inline-flex shrink-0 items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <Icon path={mdiEyeOutline} size={0.55} />
                              {(sourceTemplate.viewCount ?? 0).toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Icon path={mdiHeartOutline} size={0.55} />
                              {(sourceTemplate.likeCount ?? 0).toLocaleString()}
                            </span>
                          </span>
                        </div>
                      </div>
                    </ThumbnailCard>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        type="button"
                        className="h-9"
                        onClick={() => { void handleStartRemixFromSource(); }}
                      >
                        리믹스
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    원본 밈플릿 정보를 찾을 수 없습니다.
                  </div>
                )}
              </section>

              <section className="mt-8">
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-foreground">다른 리믹스</h3>
                </div>
                {isRelatedLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }, (_, idx) => (
                      <SidebarThumbnailSkeleton key={idx} />
                    ))}
                  </div>
                ) : relatedError ? (
                  <Alert variant="destructive">
                    <AlertTitle>목록 로딩 실패</AlertTitle>
                    <AlertDescription>{relatedError}</AlertDescription>
                  </Alert>
                ) : isRelatedLoaded && visibleRelatedRemixes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    아직 다른 리믹스가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {visibleRelatedRemixes.map((candidate) => (
                      <ThumbnailCard
                        key={candidate.id}
                        imageUrl={candidate.imageUrl}
                        title={candidate.title}
                        hoverable
                        hoverSurfaceOnly
                        onClick={() => navigate(`/remixes/s/${candidate.shareSlug}`)}
                      >
                        <div className="space-y-1">
                          <h4 className="line-clamp-1 text-sm font-semibold text-foreground">{candidate.title}</h4>
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{candidate.ownerDisplayName || candidate.ownerId || '-'}</span>
                            <span className="inline-flex shrink-0 items-center gap-2">
                              <span className="inline-flex items-center gap-1">
                                <Icon path={mdiEyeOutline} size={0.55} />
                                {(candidate.viewCount ?? 0).toLocaleString()}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Icon path={mdiHeartOutline} size={0.55} />
                                {(candidate.likeCount ?? 0).toLocaleString()}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Icon path={mdiCommentOutline} size={0.55} />
                                {(candidate.commentCount ?? 0).toLocaleString()}
                              </span>
                            </span>
                          </div>
                        </div>
                      </ThumbnailCard>
                    ))}
                  </div>
                )}
              </section>
            </aside>

            <div className="order-1 rounded-2xl bg-card p-6 lg:order-2">
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                <PreviewFrame
                  imageUrl={image.imageUrl}
                  alt={image.title}
                  imageRef={mainImageRef}
                  imageKey={image.imageUrl}
                  isImageLoaded={isMainImageLoaded}
                  isImageError={isMainImageError}
                  maxImageHeightClassName="max-h-[800px] max-w-[800px]"
                  onLoad={() => {
                    setIsMainImageError(false);
                    setIsMainImageLoaded(true);
                  }}
                  onError={() => {
                    setIsMainImageLoaded(false);
                    setIsMainImageError(true);
                  }}
                />

                <div className="space-y-6">
                  <div>
                    <h2 className="mb-2 text-3xl font-bold text-foreground">{image.title}</h2>
                    {image.description ? (
                      <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{image.description}</div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={`gap-1.5 ${likedImageByMe ? 'border-primary bg-primary/15 text-primary' : ''}`}
                      onClick={() => { void handleLikeImage(); }}
                      disabled={isLikingImage || image.visibility !== 'public'}
                      aria-label="좋아요"
                      aria-pressed={likedImageByMe}
                    >
                      <Icon path={mdiHeartOutline} size={0.75} />
                      {(image.likeCount ?? 0).toLocaleString()}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleScrollToComments}
                      aria-label="댓글 영역으로 이동"
                    >
                      <Icon path={mdiCommentOutline} size={0.75} />
                      {displayCommentCount.toLocaleString()}
                    </Button>
                    {isOwner ? (
                      <Button type="button" variant="outline" onClick={handleOpenEditDialog}>수정</Button>
                    ) : null}
                  </div>

                  <div className="space-y-3 border-t border-border/70 pt-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">만든 사람</span>
                      <span className="text-right font-medium text-foreground">{image.ownerDisplayName || image.ownerId || '-'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">생성일</span>
                      <span className="text-right font-medium text-foreground">
                        {image.createdAt ? new Date(image.createdAt).toLocaleString() : '-'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">이미지 포맷</span>
                      <span className="text-right font-medium text-foreground">{image.imageMime || '-'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">해상도</span>
                      <span className="text-right font-medium text-foreground">
                        {image.imageWidth && image.imageHeight ? `${image.imageWidth} x ${image.imageHeight}` : '-'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">파일 사이즈</span>
                      <span className="text-right font-medium text-foreground">{formatBytes(image.imageBytes ?? 0)}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">조회수</span>
                      <span className="text-right font-medium text-foreground">{(image.viewCount ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </section>

              {isOwner ? (
                <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpenChange}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>리믹스 정보 수정</DialogTitle>
                      <DialogDescription>제목과 설명을 수정합니다.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="remix-title">제목</Label>
                        <Input
                          id="remix-title"
                          value={editTitle}
                          maxLength={100}
                          onChange={(event) => setEditTitle(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="remix-description">설명</Label>
                        <Textarea
                          id="remix-description"
                          value={editDescription}
                          maxLength={500}
                          rows={4}
                          onChange={(event) => setEditDescription(event.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSavingMeta}
                        onClick={() => setIsEditDialogOpen(false)}
                      >
                        취소
                      </Button>
                      <Button
                        type="button"
                        disabled={isSavingMeta}
                        onClick={() => { void handleSaveMetaFromDialog(); }}
                      >
                        {isSavingMeta ? '저장 중...' : '저장'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}

              <section ref={commentsSectionRef} id="remix-comments" className="mt-8 border-t border-border/70 pt-6">
                <h3 className="mb-4 text-lg font-semibold text-foreground">
                  댓글({displayCommentCount.toLocaleString()})
                </h3>
                <div className="space-y-2">
                  <Textarea
                    value={commentDraft}
                    maxLength={COMMENT_BODY_MAX_LENGTH}
                    rows={3}
                    className="border border-border bg-background"
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="의견을 입력해 주세요."
                    disabled={isSubmittingComment || isSubmittingReply}
                  />
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-xs text-muted-foreground">
                      {commentDraft.trim().length}/{COMMENT_BODY_MAX_LENGTH}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSubmittingComment || isSubmittingReply}
                      onClick={() => { void handleSubmitComment(); }}
                    >
                      {isSubmittingComment ? '등록 중...' : '등록'}
                    </Button>
                  </div>
                </div>
                <div className="mt-5">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                      <Icon path={mdiCommentOutline} size={1.2} className="text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">아직 댓글이 없습니다.</p>
                      <p className="text-xs text-muted-foreground">첫 댓글을 남겨보세요.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/70 border-y border-border/70">
                      {threadedComments.topLevel.map((comment) => {
                        const authorName = comment.authorDisplayName || comment.authorId || '익명';
                        const authorInitial = authorName.trim().charAt(0) || '?';
                        const replies = threadedComments.repliesByRoot.get(comment.id) ?? [];

                        return (
                          <article key={comment.id} className="py-4">
                            <div className="flex items-start gap-3">
                              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted text-xs font-semibold text-foreground">
                                {authorInitial}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="text-sm font-semibold text-foreground">{authorName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : '-'}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
                                <div className="mt-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => handleStartReply(comment)}
                                  >
                                    답글
                                  </Button>
                                </div>
                                {renderInlineReplyComposer(comment.id)}

                                {replies.length > 0 ? (
                                  <div className="mt-3 space-y-3 border-l border-border/70 pl-3">
                                    {replies.map((reply) => {
                                      const replyAuthorName = reply.authorDisplayName || reply.authorId || '익명';
                                      return (
                                        <div key={reply.id} className="min-w-0">
                                          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <span className="text-sm font-medium text-foreground">{replyAuthorName}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {reply.createdAt ? new Date(reply.createdAt).toLocaleString() : '-'}
                                            </span>
                                          </div>
                                          {reply.replyToAuthorDisplayName ? (
                                            <p className="mb-1 text-xs text-muted-foreground">
                                              {reply.replyToAuthorDisplayName}님에게 답글
                                            </p>
                                          ) : null}
                                          <p className="whitespace-pre-wrap text-sm text-foreground">{reply.body}</p>
                                          <div className="mt-1">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                              onClick={() => handleStartReply(reply)}
                                            >
                                              답글
                                            </Button>
                                          </div>
                                          {renderInlineReplyComposer(reply.id)}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                      {threadedComments.orphanReplies.map((reply) => {
                        const replyAuthorName = reply.authorDisplayName || reply.authorId || '익명';
                        return (
                          <article key={reply.id} className="py-4">
                            <div className="ml-11 min-w-0 border-l border-border/70 pl-3">
                              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-sm font-medium text-foreground">{replyAuthorName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {reply.createdAt ? new Date(reply.createdAt).toLocaleString() : '-'}
                                </span>
                              </div>
                              {reply.replyToAuthorDisplayName ? (
                                <p className="mb-1 text-xs text-muted-foreground">
                                  {reply.replyToAuthorDisplayName}님에게 답글
                                </p>
                              ) : null}
                              <p className="whitespace-pre-wrap text-sm text-foreground">{reply.body}</p>
                              <div className="mt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => handleStartReply(reply)}
                                >
                                  답글
                                </Button>
                              </div>
                              {renderInlineReplyComposer(reply.id)}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </PageContainer>
      <MainFooter />
    </div>
  );
};

export default ImageShareDetailPage;
