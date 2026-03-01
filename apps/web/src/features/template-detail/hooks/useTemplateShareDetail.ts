import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { buildLoginPath } from '@/lib/loginNavigation';
import { apiFetch } from '@/lib/apiFetch';
import { formatImageFormatLabel } from '@/lib/imageFormat';
import { handoffDownloadToBrowser } from '@/lib/shareActions';
import { useAuthStore } from '@/stores/authStore';
import type { TemplateResponse, TemplateRecord, TemplateVisibility } from '@/types/template';
import type { MemeImageRecord, MemeImagesResponse } from '@/types/image';

export type RelatedSort = 'latest' | 'likes' | 'views';

export type ImageMeta = {
  format: string;
  resolution: string;
  fileSize: string;
};

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

export const useTemplateShareDetail = () => {
  const navigate = useNavigate();
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const authUser = useAuthStore((state) => state.user);
  const authInitialized = useAuthStore((state) => state.initialized);
  const syncSession = useAuthStore((state) => state.syncSession);
  const viewedSlugRef = React.useRef<string | null>(null);

  const [template, setTemplate] = React.useState<TemplateRecord | null>(null);
  const [imageMeta, setImageMeta] = React.useState<ImageMeta>({
    format: '-',
    resolution: '-',
    fileSize: '-',
  });
  const [relatedImages, setRelatedImages] = React.useState<MemeImageRecord[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = React.useState(false);
  const [relatedError, setRelatedError] = React.useState<string | null>(null);
  const [relatedSort, setRelatedSort] = React.useState<RelatedSort>('latest');

  const [isMainImageLoaded, setIsMainImageLoaded] = React.useState(false);
  const [isMainImageError, setIsMainImageError] = React.useState(false);
  const mainImageRef = React.useRef<HTMLImageElement | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [isUpdatingVisibility, setIsUpdatingVisibility] = React.useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = React.useState(false);
  const [isSavingMeta, setIsSavingMeta] = React.useState(false);

  const [isLikingTemplate, setIsLikingTemplate] = React.useState(false);
  const templateLikeLockRef = React.useRef(false);
  const templateLikeRequestSeqRef = React.useRef(0);
  const templateLikeAbortRef = React.useRef<AbortController | null>(null);
  const [likedTemplateByMe, setLikedTemplateByMe] = React.useState(false);

  const [isManageDialogOpen, setIsManageDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isRelatedLoaded, setIsRelatedLoaded] = React.useState(false);
  const [isOwnerFromDetail, setIsOwnerFromDetail] = React.useState<boolean | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');

  const isCurrentTemplate = Boolean(template?.shareSlug && shareSlug && template.shareSlug === shareSlug);
  const isOwnerByAuth = Boolean(
    authInitialized && isCurrentTemplate && authUser?.id && template?.ownerId && authUser.id === template.ownerId,
  );
  const isOwnerByDetail = isOwnerFromDetail === true;
  const isOwner = Boolean(isCurrentTemplate && (isOwnerByDetail || isOwnerByAuth));
  const hasRelatedRemixes = relatedImages.length > 0;
  const isPrivateSwitchHidden = hasRelatedRemixes && template?.visibility === 'public';
  const isDeleteHidden = hasRelatedRemixes;

  const sortedRelatedImages = React.useMemo(() => {
    const next = [...relatedImages];
    if (relatedSort === 'likes') {
      next.sort((a, b) => {
        const likeDiff = (b.likeCount ?? 0) - (a.likeCount ?? 0);
        if (likeDiff !== 0) return likeDiff;
        const viewDiff = (b.viewCount ?? 0) - (a.viewCount ?? 0);
        if (viewDiff !== 0) return viewDiff;
        return new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      });
      return next;
    }
    if (relatedSort === 'views') {
      next.sort((a, b) => {
        const viewDiff = (b.viewCount ?? 0) - (a.viewCount ?? 0);
        if (viewDiff !== 0) return viewDiff;
        const likeDiff = (b.likeCount ?? 0) - (a.likeCount ?? 0);
        if (likeDiff !== 0) return likeDiff;
        return new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      });
      return next;
    }
    next.sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime());
    return next;
  }, [relatedImages, relatedSort]);

  React.useEffect(() => {
    if (!authInitialized) {
      void syncSession();
    }
  }, [authInitialized, syncSession]);

  React.useEffect(() => {
    setIsLoading(true);
    setError(null);
    setTemplate(null);
    setRelatedImages([]);
    setRelatedError(null);
    setIsRelatedLoading(false);
    setIsRelatedLoaded(false);
    setIsMainImageLoaded(false);
    setIsMainImageError(false);
    setIsManageDialogOpen(false);
    setIsDeleteDialogOpen(false);
    setIsOwnerFromDetail(null);
    setEditTitle('');
    setEditDescription('');
    setIsLikingTemplate(false);
    templateLikeAbortRef.current?.abort();
    templateLikeAbortRef.current = null;
    templateLikeRequestSeqRef.current += 1;
    templateLikeLockRef.current = false;
    setLikedTemplateByMe(false);

    const load = async () => {
      if (!shareSlug) {
        setError('잘못된 공유 링크입니다.');
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/v1/memeplates/s/${shareSlug}`);
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || '밈플릿을 불러오지 못했습니다.');
        }
        const payload = (await res.json()) as TemplateResponse;
        setTemplate(payload.template);
        setIsOwnerFromDetail(typeof payload.isOwner === 'boolean' ? payload.isOwner : null);
        setLikedTemplateByMe(payload.likedByMe === true);
      } catch (err) {
        setError(err instanceof Error ? err.message : '밈플릿을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [shareSlug]);

  React.useEffect(() => {
    return () => {
      templateLikeAbortRef.current?.abort();
      templateLikeAbortRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const loadImageMeta = async () => {
      const thumbnailUrl = template?.thumbnailUrl;
      if (!thumbnailUrl) {
        setImageMeta({ format: '-', resolution: '-', fileSize: '-' });
        return;
      }

      try {
        const [imageInfo, response] = await Promise.all([
          new Promise<{ width: number; height: number }>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
            image.onerror = reject;
            image.src = thumbnailUrl;
          }),
          fetch(thumbnailUrl),
        ]);

        const blob = await response.blob();
        const format = formatImageFormatLabel(response.headers.get('content-type'), thumbnailUrl);
        setImageMeta({
          format,
          resolution: `${imageInfo.width} x ${imageInfo.height}`,
          fileSize: formatBytes(blob.size),
        });
      } catch {
        setImageMeta({
          format: formatImageFormatLabel(null, thumbnailUrl),
          resolution: '-',
          fileSize: '-',
        });
      }
    };

    void loadImageMeta();
  }, [template]);

  React.useEffect(() => {
    const loadRelatedImages = async () => {
      if (!template?.id) {
        setRelatedImages([]);
        setIsRelatedLoading(false);
        setIsRelatedLoaded(false);
        return;
      }

      setIsRelatedLoading(true);
      setIsRelatedLoaded(false);
      setRelatedError(null);
      try {
        const res = await fetch(`/api/v1/remixes/public?limit=30&templateId=${template.id}`);
        if (!res.ok) {
          throw new Error('연관 이미지를 불러오지 못했습니다.');
        }
        const payload = (await res.json()) as MemeImagesResponse;
        setRelatedImages(payload.images ?? []);
      } catch (err) {
        setRelatedError(err instanceof Error ? err.message : '연관 이미지를 불러오지 못했습니다.');
      } finally {
        setIsRelatedLoading(false);
        setIsRelatedLoaded(true);
      }
    };

    void loadRelatedImages();
  }, [template?.id]);

  React.useEffect(() => {
    setIsMainImageError(false);
    const imageEl = mainImageRef.current;
    if (imageEl && imageEl.complete && imageEl.naturalWidth > 0) {
      setIsMainImageLoaded(true);
      return;
    }
    setIsMainImageLoaded(false);
  }, [template?.thumbnailUrl]);

  React.useEffect(() => {
    setEditTitle(template?.title ?? '');
    setEditDescription(template?.description ?? '');
  }, [template?.id, template?.title, template?.description]);

  React.useEffect(() => {
    if (!shareSlug || !template || template.visibility !== 'public' || viewedSlugRef.current === shareSlug) {
      return;
    }

    viewedSlugRef.current = shareSlug;
    const incrementView = async () => {
      try {
        const res = await fetch(`/api/v1/memeplates/s/${shareSlug}/view`, {
          method: 'POST',
        });
        if (!res.ok) return;
        const payload = (await res.json().catch(() => ({}))) as { viewCount?: number };
        if (typeof payload.viewCount !== 'number') return;
        setTemplate((prev) => (prev ? { ...prev, viewCount: payload.viewCount } : prev));
      } catch {
        // 조회수 증가는 실패해도 화면 흐름을 막지 않는다.
      }
    };

    void incrementView();
  }, [shareSlug, template]);

  const handleRemixClick = React.useCallback(async () => {
    if (!template?.shareSlug) return;
    const remixPath = `/create?shareSlug=${template.shareSlug}`;

    if (authUser) {
      navigate(remixPath);
      return;
    }

    if (!authInitialized) {
      await syncSession();
      if (useAuthStore.getState().user) {
        navigate(remixPath);
        return;
      }
    }

    navigate(buildLoginPath(remixPath));
  }, [authInitialized, authUser, navigate, syncSession, template?.shareSlug]);

  const handleLikeTemplate = React.useCallback(async () => {
    if (!template?.shareSlug || template.visibility !== 'public' || templateLikeLockRef.current) return;

    const targetShareSlug = template.shareSlug;
    const requestSeq = templateLikeRequestSeqRef.current + 1;
    templateLikeRequestSeqRef.current = requestSeq;
    const controller = new AbortController();
    templateLikeAbortRef.current?.abort();
    templateLikeAbortRef.current = controller;
    templateLikeLockRef.current = true;
    setIsLikingTemplate(true);
    try {
      const res = await fetch(`/api/v1/memeplates/s/${targetShareSlug}/like`, {
        method: 'POST',
        signal: controller.signal,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '좋아요 처리에 실패했습니다.');
      }
      const payload = (await res.json().catch(() => ({}))) as { likeCount?: number; liked?: boolean };
      if (templateLikeRequestSeqRef.current !== requestSeq) return;
      if (typeof payload.likeCount === 'number') {
        setTemplate((prev) => (
          prev && prev.shareSlug === targetShareSlug ? { ...prev, likeCount: payload.likeCount } : prev
        ));
      } else {
        setTemplate((prev) => (
          prev && prev.shareSlug === targetShareSlug
            ? { ...prev, likeCount: Math.max(0, (prev.likeCount ?? 0) + (likedTemplateByMe ? -1 : 1)) }
            : prev
        ));
      }
      if (typeof payload.liked === 'boolean') {
        setLikedTemplateByMe(payload.liked);
      } else {
        setLikedTemplateByMe((prev) => !prev);
      }
    } catch (err) {
      if (templateLikeRequestSeqRef.current !== requestSeq) {
        return;
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      toast.error(err instanceof Error ? err.message : '좋아요 처리에 실패했습니다.');
    } finally {
      if (templateLikeAbortRef.current === controller) {
        templateLikeAbortRef.current = null;
      }
      if (templateLikeRequestSeqRef.current === requestSeq) {
        templateLikeLockRef.current = false;
        setIsLikingTemplate(false);
      }
    }
  }, [likedTemplateByMe, template?.shareSlug, template?.visibility]);

  const handleDownloadTemplateImage = React.useCallback(() => {
    if (!template?.thumbnailUrl || !template.shareSlug) {
      toast.error('다운로드할 이미지가 없습니다.');
      return;
    }

    handoffDownloadToBrowser(`/api/v1/memeplates/s/${template.shareSlug}/download`);
  }, [template?.shareSlug, template?.thumbnailUrl]);

  const handleCopyTemplateLink = React.useCallback(async () => {
    if (!template?.shareSlug) {
      toast.error('공유 링크를 생성할 수 없습니다.');
      return;
    }

    const shareUrl = `${window.location.origin}/memeplates/s/${template.shareSlug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('공유 링크를 복사했습니다.');
    } catch {
      toast.error('공유 링크 복사에 실패했습니다.');
    }
  }, [template?.shareSlug]);

  const handleChangeVisibility = React.useCallback(async (nextVisibility: TemplateVisibility) => {
    if (!template || !isOwner || template.visibility === nextVisibility) return;
    if (template.visibility === 'public' && nextVisibility === 'private' && hasRelatedRemixes) {
      toast.error('리믹스가 1개 이상 있는 밈플릿은 비공개로 전환할 수 없습니다.');
      return;
    }

    setIsUpdatingVisibility(true);
    try {
      const res = await apiFetch(`/api/v1/memeplates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: nextVisibility }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '공개 상태 변경에 실패했습니다.');
      }

      setTemplate((prev) => (prev ? { ...prev, visibility: nextVisibility } : prev));
      toast.success('공개 상태를 변경했습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '공개 상태 변경에 실패했습니다.');
    } finally {
      setIsUpdatingVisibility(false);
    }
  }, [hasRelatedRemixes, isOwner, template]);

  const handleDeleteTemplate = React.useCallback(async () => {
    if (!template || !isOwner) return;
    if (hasRelatedRemixes) {
      toast.error('리믹스가 1개 이상 있는 밈플릿은 삭제할 수 없습니다.');
      return;
    }

    setIsDeletingTemplate(true);
    try {
      const res = await apiFetch(`/api/v1/memeplates/${template.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '밈플릿 삭제에 실패했습니다.');
      }

      toast.success('밈플릿을 삭제했습니다.');
      setIsManageDialogOpen(false);
      setIsDeleteDialogOpen(false);
      navigate('/my/memeplates');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '밈플릿 삭제에 실패했습니다.');
    } finally {
      setIsDeletingTemplate(false);
    }
  }, [hasRelatedRemixes, isOwner, navigate, template]);

  const handleSaveMeta = React.useCallback(async () => {
    if (!template || !isOwner) return false;

    const nextTitle = editTitle.trim();
    const nextDescription = editDescription.trim();
    if (!nextTitle) {
      toast.error('제목을 입력하세요.');
      return false;
    }

    setIsSavingMeta(true);
    try {
      const res = await apiFetch(`/api/v1/memeplates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: nextTitle,
          description: nextDescription.length > 0 ? nextDescription : ''
        })
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '밈플릿 정보 수정에 실패했습니다.');
      }

      const payload = (await res.json()) as TemplateResponse;
      setTemplate(payload.template);
      setEditTitle(payload.template.title);
      setEditDescription(payload.template.description ?? '');
      toast.success('밈플릿 정보를 수정했습니다.');
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '밈플릿 정보 수정에 실패했습니다.');
      return false;
    } finally {
      setIsSavingMeta(false);
    }
  }, [editDescription, editTitle, isOwner, template]);

  const handleOpenManageDialog = React.useCallback(() => {
    if (!template || !isOwner) return;
    setEditTitle(template.title);
    setEditDescription(template.description ?? '');
    setIsManageDialogOpen(true);
  }, [isOwner, template]);

  const handleManageDialogOpenChange = React.useCallback((nextOpen: boolean) => {
    if (!nextOpen && (isUpdatingVisibility || isDeletingTemplate || isSavingMeta)) return;
    setIsManageDialogOpen(nextOpen);
  }, [isDeletingTemplate, isSavingMeta, isUpdatingVisibility]);

  const handleSaveMetaFromDialog = React.useCallback(async () => {
    await handleSaveMeta();
  }, [handleSaveMeta]);

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
    template,
    imageMeta,
    relatedImages,
    sortedRelatedImages,
    relatedSort,
    setRelatedSort,
    isRelatedLoading,
    relatedError,
    isRelatedLoaded,

    isMainImageLoaded,
    isMainImageError,
    mainImageRef,
    handleMainImageLoad,
    handleMainImageError,

    isLoading,
    error,

    isUpdatingVisibility,
    isDeletingTemplate,
    isSavingMeta,
    isLikingTemplate,
    likedTemplateByMe,

    isManageDialogOpen,
    setIsManageDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,

    isOwner,
    isPrivateSwitchHidden,
    isDeleteHidden,

    handleRemixClick,
    handleLikeTemplate,
    handleDownloadTemplateImage,
    handleCopyTemplateLink,
    handleChangeVisibility,
    handleDeleteTemplate,
    handleOpenManageDialog,
    handleManageDialogOpenChange,
    handleSaveMetaFromDialog,
    openRelatedRemix,
  };
};

export type UseTemplateShareDetailResult = ReturnType<typeof useTemplateShareDetail>;
