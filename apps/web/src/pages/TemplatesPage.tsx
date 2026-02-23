import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiEyeOutline, mdiHeartOutline } from '@mdi/js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MainHeader from '../components/layout/MainHeader';
import PageContainer from '../components/layout/PageContainer';
import TemplateThumbnailCard from '../components/TemplateThumbnailCard';
import TemplateCardSkeletonGrid from '../components/TemplateCardSkeletonGrid';
import type {
  TemplatePublicPeriod,
  TemplatePublicSortBy,
  TemplateRecord,
  TemplatesResponse
} from '../types/template';

const SORT_OPTIONS: Array<{ value: TemplatePublicSortBy; label: string }> = [
  { value: 'latest', label: '최신' },
  { value: 'likes', label: '좋아요' },
  { value: 'views', label: '조회' },
];

const PERIOD_OPTIONS: Array<{ value: TemplatePublicPeriod; label: string }> = [
  { value: '24h', label: '24시간' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: '1y', label: '1년' },
  { value: 'all', label: '전체' },
];

const fetchPublicTemplates = async (params: {
  limit: number;
  sortBy: TemplatePublicSortBy;
  period: TemplatePublicPeriod;
}): Promise<TemplateRecord[]> => {
  const search = new URLSearchParams({
    limit: String(params.limit),
    sortBy: params.sortBy,
    period: params.period,
  });
  const res = await fetch(`/api/v1/memeplates/public?${search.toString()}`);
  if (!res.ok) {
    throw new Error('밈플릿 목록 로딩 실패');
  }
  const payload = (await res.json()) as TemplatesResponse;
  return payload.templates ?? [];
};

const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = React.useState<TemplatePublicSortBy>('latest');
  const [period, setPeriod] = React.useState<TemplatePublicPeriod>('all');
  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['templates', 'public', 50, sortBy, period],
    queryFn: () => fetchPublicTemplates({ limit: 50, sortBy, period }),
  });

  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="py-8">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-muted p-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={sortBy === option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`h-8 rounded-lg px-3 text-xs font-bold ${
                    sortBy === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className="inline-flex items-center">
            <select
              aria-label="기간 선택"
              value={period}
              onChange={(event) => setPeriod(event.target.value as TemplatePublicPeriod)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        {isLoading ? (
          <TemplateCardSkeletonGrid count={6} minItemWidth={240} />
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>목록 로딩 실패</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error instanceof Error ? error.message : '밈플릿 목록을 불러오지 못했습니다.'}</span>
              <Button type="button" variant="outline" onClick={() => void refetch()}>다시 시도</Button>
            </AlertDescription>
          </Alert>
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="mb-3 text-sm text-muted-foreground">밈플릿이 없습니다.</p>
            <Button type="button" variant="outline" onClick={() => navigate('/create')}>첫 밈플릿 만들기</Button>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
          >
            {templates.map((template) => (
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
      </PageContainer>
    </div>
  );
};

export default TemplatesPage;
