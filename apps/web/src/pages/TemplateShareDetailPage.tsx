import React from 'react';
import { Alert, Button, Card, Empty, Layout, Segmented, Skeleton, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import MainHeader from '../components/layout/MainHeader';
import PageContainer from '../components/layout/PageContainer';
import type { TemplateResponse, TemplateRecord } from '../types/template';
import type { MemeImageRecord, MemeImagesResponse } from '../types/image';
import ThumbnailCard from '../components/ThumbnailCard';

const { Title, Text } = Typography;
const RELATED_SKELETON_ITEMS = Array.from({ length: 6 }, (_, idx) => idx);

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
  const viewedSlugRef = React.useRef<string | null>(null);
  const [template, setTemplate] = React.useState<TemplateRecord | null>(null);
  const [imageMeta, setImageMeta] = React.useState<ImageMeta>({
    format: '-',
    resolution: '-',
    fileSize: '-'
  });
  const [relatedImages, setRelatedImages] = React.useState<MemeImageRecord[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = React.useState(false);
  const [relatedError, setRelatedError] = React.useState<string | null>(null);
  const [relatedSort, setRelatedSort] = React.useState<'latest' | 'popular'>('latest');
  const [isMainImageLoaded, setIsMainImageLoaded] = React.useState(false);
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
      (a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
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
      if (!template?.thumbnailUrl) {
        setImageMeta({ format: '-', resolution: '-', fileSize: '-' });
        return;
      }

      try {
        const [imageInfo, response] = await Promise.all([
          new Promise<{ width: number; height: number }>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
            image.onerror = reject;
            image.src = template.thumbnailUrl;
          }),
          fetch(template.thumbnailUrl)
        ]);

        const blob = await response.blob();
        const format = formatMimeToLabel(response.headers.get('content-type'), template.thumbnailUrl);
        setImageMeta({
          format,
          resolution: `${imageInfo.width} x ${imageInfo.height}`,
          fileSize: formatBytes(blob.size)
        });
      } catch {
        setImageMeta({
          format: formatMimeToLabel(null, template.thumbnailUrl),
          resolution: '-',
          fileSize: '-'
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
          method: 'POST'
        });
        if (!res.ok) return;
        const payload = (await res.json().catch(() => ({}))) as { viewCount?: number };
        if (typeof payload.viewCount !== 'number') return;
        setTemplate((prev) => (
          prev ? { ...prev, viewCount: payload.viewCount } : prev
        ));
      } catch {
        // 조회수 증가는 실패해도 화면 흐름을 막지 않는다.
      }
    };

    void incrementView();
  }, [shareSlug, template]);

  return (
    <Layout className="min-h-screen bg-white">
      <MainHeader />
      <PageContainer className="py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <Card className="rounded-2xl">
              <div className="mb-4 space-y-2">
                <Skeleton.Input active size="small" block />
                <Skeleton.Input active size="small" style={{ width: 120 }} />
              </div>
              <div className="h-56 rounded-xl border border-slate-200 bg-slate-100">
                <div className="h-full w-full animate-pulse rounded-xl bg-gradient-to-br from-slate-100 to-slate-200" />
              </div>
              <div className="mt-4 space-y-2">
                {Array.from({ length: 6 }, (_, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <Skeleton.Input active size="small" style={{ width: 72 }} />
                    <Skeleton.Input active size="small" style={{ width: 120 }} />
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-2">
                <Skeleton.Button active block />
                <Skeleton.Button active block />
              </div>
            </Card>
            <Card className="rounded-2xl">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton.Input active size="small" style={{ width: 180 }} />
                  <Skeleton.Input active size="small" style={{ width: 90 }} />
                </div>
                <Skeleton.Input active size="small" style={{ width: 120 }} />
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                {RELATED_SKELETON_ITEMS.map((key) => (
                  <div key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="h-52 border-b border-slate-100 bg-slate-100 p-3">
                      <div className="h-full w-full animate-pulse rounded-lg bg-gradient-to-br from-slate-100 to-slate-200" />
                    </div>
                    <div className="space-y-3 p-4">
                      <Skeleton.Input active size="small" block />
                      <div className="flex items-center justify-between gap-3">
                        <Skeleton.Input active size="small" style={{ width: 96 }} />
                        <Skeleton.Input active size="small" style={{ width: 76 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : error ? (
          <Alert type="error" message={error} />
        ) : template ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-20 lg:self-start">
              <Card className="rounded-2xl">
              <div className="mb-4">
                <Title level={3} className="!mb-1">{template.title}</Title>
                <Text type="secondary">원본 밈플릿</Text>
                {template.description ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                    {template.description}
                  </div>
                ) : null}
              </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {template.thumbnailUrl ? (
                    <div className="relative flex items-center justify-center p-4">
                      {!isMainImageLoaded ? (
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
                      ) : null}
                      <img
                        src={template.thumbnailUrl}
                        alt={template.title}
                        crossOrigin="anonymous"
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        onLoad={() => setIsMainImageLoaded(true)}
                        className={`max-h-[360px] w-full object-contain transition-opacity duration-200 ${isMainImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                      />
                    </div>
                  ) : (
                    <div className="h-56 flex items-center justify-center text-slate-400">미리보기 없음</div>
                  )}
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">만든 사람</span>
                    <span className="text-right font-medium text-slate-800">
                      {template.ownerDisplayName || template.ownerId || '-'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">생성일</span>
                    <span className="text-right font-medium text-slate-800">
                      {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">이미지 포맷</span>
                    <span className="text-right font-medium text-slate-800">{imageMeta.format}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">해상도</span>
                    <span className="text-right font-medium text-slate-800">{imageMeta.resolution}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">파일 사이즈</span>
                    <span className="text-right font-medium text-slate-800">{imageMeta.fileSize}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">조회수</span>
                    <span className="text-right font-medium text-slate-800">{(template.viewCount ?? 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-2">
                  <Button type="primary" onClick={() => navigate(`/create?shareSlug=${template.shareSlug}`)}>
                    리믹스
                  </Button>
                  <Button onClick={() => navigate('/templates')}>밈플릿 목록으로</Button>
                </div>
              </Card>
            </div>
            <Card className="rounded-2xl">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <Title level={4} className="!mb-1">리믹스 목록</Title>
                  <Text type="secondary">총 {relatedImages.length.toLocaleString()}개</Text>
                </div>
                <Segmented
                  size="small"
                  value={relatedSort}
                  onChange={(value) => setRelatedSort(value as 'latest' | 'popular')}
                  options={[
                    { label: '최신순', value: 'latest' },
                    { label: '인기순', value: 'popular' }
                  ]}
                />
              </div>
              {isRelatedLoading ? (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                  {RELATED_SKELETON_ITEMS.map((key) => (
                    <div key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="h-52 border-b border-slate-100 bg-slate-100 p-3">
                        <div className="h-full w-full animate-pulse rounded-lg bg-gradient-to-br from-slate-100 to-slate-200" />
                      </div>
                      <div className="space-y-3 p-4">
                        <Skeleton.Input active size="small" block />
                        <div className="flex items-center justify-between gap-3">
                          <Skeleton.Input active size="small" style={{ width: 96 }} />
                          <Skeleton.Input active size="small" style={{ width: 76 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : relatedError ? (
                <Alert type="error" message={relatedError} />
              ) : relatedImages.length === 0 ? (
                <Empty description="아직 등록된 리믹스가 없습니다." />
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
                        <div className="line-clamp-1 text-sm font-semibold text-slate-900">{image.title}</div>
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="truncate">{image.ownerDisplayName || '-'}</span>
                          <span className="shrink-0">조회 {(image.viewCount ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </ThumbnailCard>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </PageContainer>
    </Layout>
  );
};

export default TemplateShareDetailPage;
