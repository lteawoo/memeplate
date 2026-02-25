import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Icon from '@mdi/react';
import {
  mdiCommentOutline,
  mdiChevronRight,
  mdiEyeOutline,
  mdiHeartOutline,
  mdiImage,
  mdiPlus,
  mdiShareVariant,
  mdiViewGridOutline,
} from '@mdi/js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import MainHeader from '../components/layout/MainHeader';
import MainFooter from '../components/layout/MainFooter';
import PageContainer from '../components/layout/PageContainer';
import TemplateCardSkeletonGrid from '../components/TemplateCardSkeletonGrid';
import TemplateThumbnailCard from '../components/TemplateThumbnailCard';
import ThumbnailCard from '../components/ThumbnailCard';
import type { TemplatePublicPeriod, TemplatePublicSortBy, TemplatesResponse } from '../types/template';
import type { MemeImageRecord, MemeImagesResponse } from '../types/image';

type QuickAction = {
  title: string;
  description: string;
  iconPath: string;
  actionLabel: string;
  onClick: () => void;
};

const fetchPublicTemplates = async (params: {
  limit: number;
  sortBy: TemplatePublicSortBy;
  period?: TemplatePublicPeriod;
}) => {
  const search = new URLSearchParams({
    limit: String(params.limit),
    sortBy: params.sortBy,
    period: params.period ?? 'all',
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
    data: latestTemplates = [],
    isLoading: isLatestTemplatesLoading,
  } = useQuery({
    queryKey: ['home', 'latest-templates', 6],
    queryFn: () => fetchPublicTemplates({ limit: 6, sortBy: 'latest' }),
  });
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

  const heroTemplate = latestTemplates[0] ?? featuredTemplates[0] ?? null;
  const sideTemplates = (latestTemplates.length > 1 ? latestTemplates.slice(1, 3) : featuredTemplates.slice(1, 3))
    .filter((template) => template.shareSlug !== heroTemplate?.shareSlug);

  const remixPath = heroTemplate?.shareSlug ? `/create?shareSlug=${heroTemplate.shareSlug}` : '/create';
  const quickActions: QuickAction[] = [
    {
      title: '이미지로 시작',
      description: '원본 이미지를 올리고 바로 밈플릿을 만듭니다.',
      iconPath: mdiImage,
      actionLabel: '새 밈플릿 만들기',
      onClick: () => navigate('/create'),
    },
    {
      title: '인기 밈플릿 리믹스',
      description: '오늘 반응이 높은 템플릿으로 빠르게 리믹스합니다.',
      iconPath: mdiViewGridOutline,
      actionLabel: '리믹스로 시작',
      onClick: () => navigate(remixPath),
    },
    {
      title: '바로 공유하기',
      description: '텍스트 수정 후 링크로 바로 배포합니다.',
      iconPath: mdiShareVariant,
      actionLabel: '밈플릿 둘러보기',
      onClick: () => navigate('/memeplates'),
    },
  ];

  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="space-y-8 py-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="overflow-hidden border border-border bg-card">
            <CardContent className="space-y-6 p-8">
              <div className="space-y-4">
                <p className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  초기 공개 베타
                </p>
                <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-foreground md:text-5xl">
                  이미지 하나로 밈플릿 만들고, 바로 공유하세요
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                  템플릿 생성부터 텍스트 편집, 공유 링크 발행까지 한 흐름으로 이어집니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" size="lg" onClick={() => navigate('/create')} className="h-12 gap-2 px-6">
                  <Icon path={mdiPlus} size={0.85} />
                  밈플릿 만들기
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={() => navigate('/memeplates')} className="h-12 gap-2 px-6">
                  밈플릿 둘러보기
                  <Icon path={mdiChevronRight} size={0.75} />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">웹에서 바로 편집</span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">공유 링크 즉시 생성</span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">리믹스 빠른 시작</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {isLatestTemplatesLoading && !heroTemplate ? (
              <Card className="border border-border bg-card">
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-5 w-28 rounded bg-border/70" />
                  <Skeleton className="h-52 w-full rounded-xl bg-border/70" />
                  <Skeleton className="h-4 w-full rounded bg-border/70" />
                </CardContent>
              </Card>
            ) : heroTemplate ? (
              <TemplateThumbnailCard
                template={heroTemplate}
                hoverable
                hoverSurfaceOnly
                onClick={() => navigate(`/memeplates/s/${heroTemplate.shareSlug}`)}
              >
                <div className="space-y-1">
                  <div className="line-clamp-1 text-sm font-semibold text-foreground">{heroTemplate.title}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{heroTemplate.description || '오늘 추천 밈플릿'}</div>
                  <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                    <span className="truncate">{heroTemplate.ownerDisplayName || '-'}</span>
                    <span className="inline-flex shrink-0 items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <Icon path={mdiEyeOutline} size={0.55} />
                        {(heroTemplate.viewCount ?? 0).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Icon path={mdiHeartOutline} size={0.55} />
                        {(heroTemplate.likeCount ?? 0).toLocaleString()}
                      </span>
                    </span>
                  </div>
                </div>
              </TemplateThumbnailCard>
            ) : (
              <Card className="border border-dashed border-border bg-card">
                <CardContent className="space-y-3 p-6 text-center">
                  <p className="text-sm text-muted-foreground">아직 공개된 밈플릿이 없습니다.</p>
                  <Button type="button" variant="outline" onClick={() => navigate('/create')}>
                    첫 밈플릿 만들기
                  </Button>
                </CardContent>
              </Card>
            )}
            {sideTemplates.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1">
                {sideTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => navigate(`/memeplates/s/${template.shareSlug}`)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="line-clamp-1 text-sm font-semibold text-foreground">{template.title}</div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">{template.ownerDisplayName || '-'}</div>
                    </div>
                    <Icon path={mdiChevronRight} size={0.75} className="shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

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

        <section className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={action.onClick}
              className="group rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
                <Icon path={action.iconPath} size={0.85} />
              </div>
              <div className="mb-1 text-sm font-bold text-foreground">{action.title}</div>
              <p className="mb-4 text-xs text-muted-foreground">{action.description}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                {action.actionLabel}
                <Icon path={mdiChevronRight} size={0.65} />
              </span>
            </button>
          ))}
        </section>
      </PageContainer>
      <MainFooter />
    </div>
  );
};

export default HomePage;
