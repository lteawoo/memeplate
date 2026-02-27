import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Icon from '@mdi/react';
import {
  mdiCommentOutline,
  mdiEyeOutline,
  mdiHeartOutline,
} from '@mdi/js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MainHeader from '../components/layout/MainHeader';
import MainFooter from '../components/layout/MainFooter';
import PageContainer from '../components/layout/PageContainer';
import TemplateCardSkeletonGrid from '../components/TemplateCardSkeletonGrid';
import TemplateThumbnailCard from '../components/TemplateThumbnailCard';
import ThumbnailCard from '../components/ThumbnailCard';
import type { TemplatePublicSortBy, TemplatesResponse } from '../types/template';
import type { MemeImageRecord, MemeImagesResponse } from '../types/image';

const fetchPublicTemplates = async (params: {
  limit: number;
  sortBy: TemplatePublicSortBy;
}) => {
  const search = new URLSearchParams({
    limit: String(params.limit),
    sortBy: params.sortBy,
    period: 'all',
  });
  const res = await fetch(`/api/v1/memeplates/public?${search.toString()}`);
  if (!res.ok) {
    throw new Error('밈플릿 목록을 불러오지 못했습니다.');
  }
  const payload = (await res.json()) as TemplatesResponse;
  return payload.templates ?? [];
};

const fetchPublicRemixes = async (limit: number) => {
  const search = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`/api/v1/remixes/public?${search.toString()}`);
  if (!res.ok) {
    throw new Error('최근 리믹스를 불러오지 못했습니다.');
  }
  const payload = (await res.json()) as MemeImagesResponse;
  return payload.images ?? [];
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: featuredTemplates = [],
    isLoading: isFeaturedTemplatesLoading,
    error: featuredTemplatesError,
    refetch: refetchFeaturedTemplates,
  } = useQuery({
    queryKey: ['home', 'featured-templates', 8],
    queryFn: () => fetchPublicTemplates({ limit: 8, sortBy: 'likes' }),
  });
  const {
    data: recentRemixes = [],
    isLoading: isRecentRemixesLoading,
    error: recentRemixesError,
    refetch: refetchRecentRemixes,
  } = useQuery({
    queryKey: ['home', 'recent-remixes', 6],
    queryFn: () => fetchPublicRemixes(6),
  });

  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="space-y-8 py-8">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-xl font-bold text-foreground">추천 밈플릿</h2>
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => navigate('/memeplates')}>
              전체 보기
            </Button>
          </div>

          {isFeaturedTemplatesLoading ? (
            <TemplateCardSkeletonGrid count={8} minItemWidth={240} />
          ) : featuredTemplatesError ? (
            <Alert variant="destructive">
              <AlertTitle>추천 밈플릿 로딩 실패</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{featuredTemplatesError instanceof Error ? featuredTemplatesError.message : '추천 목록을 불러오지 못했습니다.'}</span>
                <Button type="button" variant="outline" onClick={() => void refetchFeaturedTemplates()}>
                  다시 시도
                </Button>
              </AlertDescription>
            </Alert>
          ) : featuredTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              공개된 밈플릿이 없습니다. 첫 밈플릿을 만들어보세요.
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {featuredTemplates.map((template) => (
                <TemplateThumbnailCard
                  key={template.id}
                  template={template}
                  hoverable
                  hoverSurfaceOnly
                  onClick={() => navigate(`/memeplates/s/${template.shareSlug}`)}
                >
                  <div className="space-y-1">
                    <div className="line-clamp-1 text-sm font-semibold text-foreground">{template.title}</div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{template.ownerDisplayName || '-'}</span>
                      <span className="inline-flex shrink-0 items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <Icon path={mdiEyeOutline} size={0.55} />
                          {(template.viewCount ?? 0).toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Icon path={mdiHeartOutline} size={0.55} />
                          {(template.likeCount ?? 0).toLocaleString()}
                        </span>
                      </span>
                    </div>
                  </div>
                </TemplateThumbnailCard>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-xl font-bold text-foreground">최근 리믹스 활동</h2>
          </div>

          {isRecentRemixesLoading ? (
            <TemplateCardSkeletonGrid count={6} minItemWidth={240} />
          ) : recentRemixesError ? (
            <Alert variant="destructive">
              <AlertTitle>최근 리믹스 로딩 실패</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{recentRemixesError instanceof Error ? recentRemixesError.message : '최근 리믹스를 불러오지 못했습니다.'}</span>
                <Button type="button" variant="outline" onClick={() => void refetchRecentRemixes()}>
                  다시 시도
                </Button>
              </AlertDescription>
            </Alert>
          ) : recentRemixes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              최근 공개된 리믹스가 아직 없습니다.
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {recentRemixes.map((image: MemeImageRecord) => (
                <ThumbnailCard
                  key={image.id}
                  imageUrl={image.imageUrl}
                  title={image.title}
                  hoverable
                  hoverSurfaceOnly
                  onClick={() => navigate(`/remixes/s/${image.shareSlug}`)}
                >
                  <div className="space-y-1">
                    <div className="line-clamp-1 text-sm font-semibold text-foreground">{image.title}</div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{image.ownerDisplayName || '-'}</span>
                      <span className="inline-flex shrink-0 items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <Icon path={mdiEyeOutline} size={0.55} />
                          {(image.viewCount ?? 0).toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Icon path={mdiHeartOutline} size={0.55} />
                          {(image.likeCount ?? 0).toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Icon path={mdiCommentOutline} size={0.55} />
                          {(image.commentCount ?? 0).toLocaleString()}
                        </span>
                      </span>
                    </div>
                  </div>
                </ThumbnailCard>
              ))}
            </div>
          )}
        </section>
      </PageContainer>
      <MainFooter />
    </div>
  );
};

export default HomePage;
