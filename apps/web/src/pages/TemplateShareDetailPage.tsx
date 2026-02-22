import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiImageOffOutline } from '@mdi/js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { buildLoginPath } from '@/lib/loginNavigation';
import MainHeader from '../components/layout/MainHeader';
import PageContainer from '../components/layout/PageContainer';
import TemplateCardSkeletonGrid from '../components/TemplateCardSkeletonGrid';
import PreviewFrame from '../components/PreviewFrame';
import { useAuthStore } from '../stores/authStore';
import type { TemplateResponse, TemplateRecord } from '../types/template';
import type { MemeImageRecord, MemeImagesResponse } from '../types/image';
import ThumbnailCard from '../components/ThumbnailCard';

const DETAIL_RELATED_SKELETON_COUNT = 2;

type ImageMeta = {
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

const formatMimeToLabel = (contentType: string | null, fallbackUrl?: string) => {
  if (contentType?.includes('/')) {
    return contentType.split('/')[1].toUpperCase();
  }
  if (!fallbackUrl) return '-';
  const ext = fallbackUrl.split('?')[0].split('.').pop();
  return ext ? ext.toUpperCase() : '-';
};

const TemplateShareDetailPage: React.FC = () => {
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
  const [relatedSort, setRelatedSort] = React.useState<'latest' | 'popular'>('latest');
  const [isMainImageLoaded, setIsMainImageLoaded] = React.useState(false);
  const [isMainImageError, setIsMainImageError] = React.useState(false);
  const mainImageRef = React.useRef<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const sortedRelatedImages = React.useMemo(() => {
    const next = [...relatedImages];
    if (relatedSort === 'popular') {
      next.sort((a, b) => {
        const likeDiff = (b.likeCount ?? 0) - (a.likeCount ?? 0);
        if (likeDiff !== 0) return likeDiff;
        const viewDiff = (b.viewCount ?? 0) - (a.viewCount ?? 0);
        if (viewDiff !== 0) return viewDiff;
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      });
      return next;
    }
    next.sort(
      (a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
    );
    return next;
  }, [relatedImages, relatedSort]);

  React.useEffect(() => {
    const load = async () => {
      if (!shareSlug) {
        setError('잘못된 공유 링크입니다.');
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/v1/templates/s/${shareSlug}`);
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || '밈플릿을 불러오지 못했습니다.');
        }
        const payload = (await res.json()) as TemplateResponse;
        setTemplate(payload.template);
      } catch (err) {
        setError(err instanceof Error ? err.message : '밈플릿을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [shareSlug]);

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
        const format = formatMimeToLabel(response.headers.get('content-type'), thumbnailUrl);
        setImageMeta({
          format,
          resolution: `${imageInfo.width} x ${imageInfo.height}`,
          fileSize: formatBytes(blob.size),
        });
      } catch {
        setImageMeta({
          format: formatMimeToLabel(null, thumbnailUrl),
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
        return;
      }

      setIsRelatedLoading(true);
      setRelatedError(null);
      try {
        const res = await fetch(`/api/v1/images/public?limit=30&templateId=${template.id}`);
        if (!res.ok) {
          throw new Error('연관 이미지를 불러오지 못했습니다.');
        }
        const payload = (await res.json()) as MemeImagesResponse;
        setRelatedImages(payload.images ?? []);
      } catch (err) {
        setRelatedError(err instanceof Error ? err.message : '연관 이미지를 불러오지 못했습니다.');
      } finally {
        setIsRelatedLoading(false);
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
    if (!shareSlug || !template || viewedSlugRef.current === shareSlug) {
      return;
    }

    viewedSlugRef.current = shareSlug;
    const incrementView = async () => {
      try {
        const res = await fetch(`/api/v1/templates/s/${shareSlug}/view`, {
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

  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="rounded-2xl bg-card p-6">
              <div className="mb-4 space-y-2">
                <Skeleton className="h-5 w-full rounded bg-border/80" />
                <Skeleton className="h-4 w-28 rounded bg-border/70" />
              </div>
              <PreviewFrame alt="밈플릿 프리뷰 로딩" loadingPlaceholder contentClassName="h-52 p-2" />
              <div className="mt-4 space-y-2">
                {Array.from({ length: 6 }, (_, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-16 rounded bg-border/70" />
                    <Skeleton className="h-4 w-28 rounded bg-border/70" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-card p-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-44 rounded bg-border/80" />
                  <Skeleton className="h-4 w-24 rounded bg-border/70" />
                </div>
                <Skeleton className="h-8 w-28 rounded bg-border/70" />
              </div>
              <div className="min-h-[280px]">
                <TemplateCardSkeletonGrid count={DETAIL_RELATED_SKELETON_COUNT} minItemWidth={220} />
              </div>
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>상세 로딩 실패</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : template ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-2xl bg-card p-6">
                <div className="mb-4">
                  <h3 className="mb-1 text-2xl font-bold text-foreground">{template.title}</h3>
                  {template.description ? (
                    <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{template.description}</div>
                  ) : null}
                </div>
                <PreviewFrame
                  imageUrl={template.thumbnailUrl}
                  alt={template.title}
                  imageRef={mainImageRef}
                  imageKey={template.thumbnailUrl}
                  isImageLoaded={isMainImageLoaded}
                  isImageError={isMainImageError}
                  maxImageHeightClassName="max-h-[360px]"
                  onLoad={() => {
                    setIsMainImageError(false);
                    setIsMainImageLoaded(true);
                  }}
                  onError={() => {
                    setIsMainImageLoaded(false);
                    setIsMainImageError(true);
                  }}
                />
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">만든 사람</span>
                    <span className="text-right font-medium text-foreground">{template.ownerDisplayName || template.ownerId || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">생성일</span>
                    <span className="text-right font-medium text-foreground">{template.createdAt ? new Date(template.createdAt).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">이미지 포맷</span>
                    <span className="text-right font-medium text-foreground">{imageMeta.format}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">해상도</span>
                    <span className="text-right font-medium text-foreground">{imageMeta.resolution}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">파일 사이즈</span>
                    <span className="text-right font-medium text-foreground">{imageMeta.fileSize}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">조회수</span>
                    <span className="text-right font-medium text-foreground">{(template.viewCount ?? 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-2">
                  <Button type="button" onClick={() => { void handleRemixClick(); }}>리믹스</Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-card p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h4 className="mb-1 text-xl font-bold text-foreground">리믹스</h4>
                  <span className="text-sm text-muted-foreground">총 {relatedImages.length.toLocaleString()}개</span>
                </div>
                <div className="flex items-center rounded-xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setRelatedSort('latest')}
                    className={`h-8 rounded-lg px-3 text-xs font-bold ${relatedSort === 'latest' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                  >
                    최신순
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelatedSort('popular')}
                    className={`h-8 rounded-lg px-3 text-xs font-bold ${relatedSort === 'popular' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                  >
                    인기순
                  </button>
                </div>
              </div>

              {isRelatedLoading ? (
                <div className="min-h-[280px]">
                  <TemplateCardSkeletonGrid count={DETAIL_RELATED_SKELETON_COUNT} minItemWidth={220} />
                </div>
              ) : relatedError ? (
                <Alert variant="destructive">
                  <AlertTitle>연관 이미지 로딩 실패</AlertTitle>
                  <AlertDescription>{relatedError}</AlertDescription>
                </Alert>
              ) : relatedImages.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl bg-transparent px-6 py-12 text-center text-muted-foreground">
                  <Icon path={mdiImageOffOutline} size={1.15} className="text-foreground/60" />
                  <div className="text-sm font-semibold text-foreground">아직 등록된 리믹스가 없습니다.</div>
                  <div className="text-xs text-muted-foreground">첫 리믹스를 만들어보세요.</div>
                </div>
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                  {sortedRelatedImages.map((image) => (
                    <ThumbnailCard
                      key={image.id}
                      imageUrl={image.imageUrl}
                      title={image.title}
                      hoverable
                      onClick={() => navigate(`/images/s/${image.shareSlug}`)}
                    >
                      <div className="space-y-1">
                        <div className="line-clamp-1 text-sm font-semibold text-foreground">{image.title}</div>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{image.ownerDisplayName || '-'}</span>
                          <span className="shrink-0">조회 {(image.viewCount ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </ThumbnailCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </PageContainer>
    </div>
  );
};

export default TemplateShareDetailPage;
