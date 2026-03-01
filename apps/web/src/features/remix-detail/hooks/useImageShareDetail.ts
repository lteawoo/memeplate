import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/apiFetch';
import { buildLoginPath, getPathWithSearchAndHash } from '@/lib/loginNavigation';
import { handoffDownloadToBrowser } from '@/lib/shareActions';
import { useAuthStore } from '@/stores/authStore';
import type {
  MemeImageRecord,
  MemeImagesResponse,
  MemeImageResponse,
  RemixCommentCreateResponse,
  RemixCommentRecord,
  SourceTemplateSummary
} from '@/types/image';

const COMMENT_BODY_MAX_LENGTH = 500;
const COMMENT_LIST_LIMIT = 100;
const RELATED_REMIXES_LIMIT = 12;

export type ReplyTarget = {
  commentId: string;
  authorName: string;
};

export const formatBytes = (bytes: number) => {
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

export const useImageShareDetail = () => {
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

  const visibleRelatedRemixes = React.useMemo(() => relatedRemixes.slice(0, 6), [relatedRemixes]);

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
        setRelatedRemixes(next.filter((candidate) => candidate.shareSlug && candidate.shareSlug !== currentShareSlug));
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
        setImage((prev) => (prev && prev.shareSlug === targetShareSlug ? { ...prev, likeCount: payload.likeCount } : prev));
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

  const handleDownloadRemixImage = React.useCallback(() => {
    if (!image?.imageUrl || !image.shareSlug) {
      toast.error('다운로드할 이미지가 없습니다.');
      return;
    }

    handoffDownloadToBrowser(`/api/v1/remixes/s/${image.shareSlug}/download`);
  }, [image?.imageUrl, image?.shareSlug]);

  const handleCopyRemixLink = React.useCallback(async () => {
    if (!image?.shareSlug) {
      toast.error('공유 링크를 생성할 수 없습니다.');
      return;
    }

    const shareUrl = `${window.location.origin}/remixes/s/${image.shareSlug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('공유 링크를 복사했습니다.');
    } catch {
      toast.error('공유 링크 복사에 실패했습니다.');
    }
  }, [image?.shareSlug]);

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
      setCommentsTotalCount((prev) => (typeof payload.totalCount === 'number' ? payload.totalCount : prev + 1));
      setCommentDraft('');
      toast.success('댓글을 등록했습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '댓글 등록에 실패했습니다.');
    } finally {
      setIsSubmittingComment(false);
    }
  }, [commentDraft, ensureSignedInUser, image?.id, isSubmittingReply, isSubmittingComment, shareSlug]);

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
      setCommentsTotalCount((prev) => (typeof payload.totalCount === 'number' ? payload.totalCount : prev + 1));
      setReplyDraft('');
      setActiveReplyTarget(null);
      toast.success('답글을 등록했습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '답글 등록에 실패했습니다.');
    } finally {
      setIsSubmittingReply(false);
    }
  }, [activeReplyTarget, ensureSignedInUser, image?.id, isSubmittingComment, isSubmittingReply, replyDraft, shareSlug]);

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

  const handleMainImageLoad = React.useCallback(() => {
    setIsMainImageError(false);
    setIsMainImageLoaded(true);
  }, []);

  const handleMainImageError = React.useCallback(() => {
    setIsMainImageLoaded(false);
    setIsMainImageError(true);
  }, []);

  const openRelatedRemix = React.useCallback((targetShareSlug: string) => {
    navigate(`/remixes/s/${targetShareSlug}`);
  }, [navigate]);

  return {
    image,
    isMainImageLoaded,
    isMainImageError,
    mainImageRef,
    isLoading,
    error,

    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isSavingMeta,

    isLikingImage,
    likedImageByMe,

    sourceTemplate,
    relatedRemixes,
    isRelatedLoading,
    isRelatedLoaded,
    relatedError,
    visibleRelatedRemixes,

    comments,
    threadedComments,
    commentsTotalCount,
    commentDraft,
    setCommentDraft,
    activeReplyTarget,
    replyDraft,
    setReplyDraft,
    isSubmittingComment,
    isSubmittingReply,
    commentsSectionRef,

    isOwner,
    displayCommentCount,

    handleLikeImage,
    handleScrollToComments,
    handleDownloadRemixImage,
    handleCopyRemixLink,
    handleOpenSourceTemplate,
    handleStartRemixFromSource,
    handleSubmitComment,
    handleSubmitInlineReply,
    handleStartReply,
    handleCancelReply,
    handleOpenEditDialog,
    handleSaveMetaFromDialog,
    handleEditDialogOpenChange,
    handleMainImageLoad,
    handleMainImageError,
    openRelatedRemix,
  };
};

export const IMAGE_DETAIL_LIMITS = {
  commentBodyMaxLength: COMMENT_BODY_MAX_LENGTH,
} as const;

export type UseImageShareDetailResult = ReturnType<typeof useImageShareDetail>;
