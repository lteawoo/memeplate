import React from 'react';
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import MainHeader from '../components/layout/MainHeader';
import PageContainer from '../components/layout/PageContainer';
import PreviewFrame from '../components/PreviewFrame';
import type { MemeImageRecord, MemeImageResponse } from '../types/image';

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

const ImageShareDetailPage: React.FC = () => {
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const viewedSlugRef = React.useRef<string | null>(null);
  const [image, setImage] = React.useState<MemeImageRecord | null>(null);
  const [isMainImageLoaded, setIsMainImageLoaded] = React.useState(false);
  const [isMainImageError, setIsMainImageError] = React.useState(false);
  const mainImageRef = React.useRef<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      if (!shareSlug) {
        setError('잘못된 공유 링크입니다.');
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/v1/images/s/${shareSlug}`);
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || '이미지를 불러오지 못했습니다.');
        }
        const payload = (await res.json()) as MemeImageResponse;
        setImage(payload.image);
      } catch (err) {
        setError(err instanceof Error ? err.message : '이미지를 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [shareSlug]);

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
    if (!shareSlug || !image || viewedSlugRef.current === shareSlug) return;

    viewedSlugRef.current = shareSlug;
    const incrementView = async () => {
      try {
        const res = await fetch(`/api/v1/images/s/${shareSlug}/view`, { method: 'POST' });
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

  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-2xl bg-card p-6">
              <div className="mb-6 space-y-2">
                <Skeleton className="h-6 w-full rounded bg-border/80" />
                <Skeleton className="h-4 w-44 rounded bg-border/70" />
              </div>
              <PreviewFrame alt="공유 이미지 로딩" loadingPlaceholder contentClassName="h-[480px]" />
            </div>
            <div className="rounded-2xl bg-card p-6">
              <Skeleton className="mb-4 h-5 w-24 rounded bg-border/70" />
              <div className="space-y-3">
                {Array.from({ length: 7 }, (_, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-16 rounded bg-border/70" />
                    <Skeleton className="h-4 w-28 rounded bg-border/70" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>이미지 로딩 실패</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : image ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-2xl bg-card p-6">
              <div className="mb-6">
                <h2 className="mb-2 text-3xl font-bold text-foreground">{image.title}</h2>
                {image.description ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{image.description}</div>
                ) : null}
              </div>
              <PreviewFrame
                imageUrl={image.imageUrl}
                alt={image.title}
                imageRef={mainImageRef}
                imageKey={image.imageUrl}
                isImageLoaded={isMainImageLoaded}
                isImageError={isMainImageError}
                maxImageHeightClassName="max-h-[640px]"
                onLoad={() => {
                  setIsMainImageError(false);
                  setIsMainImageLoaded(true);
                }}
                onError={() => {
                  setIsMainImageLoaded(false);
                  setIsMainImageError(true);
                }}
              />
            </div>
            <div className="rounded-2xl bg-card p-6">
              <h3 className="mb-4 text-base font-semibold text-foreground">상세 정보</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">만든 사람</span>
                  <span className="text-right font-medium text-foreground">{image.ownerDisplayName || image.ownerId || '-'}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">생성일</span>
                  <span className="text-right font-medium text-foreground">{image.createdAt ? new Date(image.createdAt).toLocaleString() : '-'}</span>
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
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">좋아요</span>
                  <span className="text-right font-medium text-foreground">{(image.likeCount ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </div>
  );
};

export default ImageShareDetailPage;
