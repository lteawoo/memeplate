import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiEyeOutline, mdiHeartOutline } from '@mdi/js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buildLoginPath, getPathWithSearchAndHash } from '@/lib/loginNavigation';
import MySectionLayout from '../components/layout/MySectionLayout';
import TemplateCardSkeletonGrid from '../components/TemplateCardSkeletonGrid';
import TemplateThumbnailCard from '../components/TemplateThumbnailCard';
import type {
  TemplatePublicPeriod,
  TemplatePublicSortBy,
  TemplateRecord,
  TemplatesResponse
} from '../types/template';
import { apiFetch } from '../lib/apiFetch';

class AuthRequiredError extends Error {}

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

const getPeriodCutoffTimestamp = (period: TemplatePublicPeriod): number | null => {
  if (period === 'all') return null;
  const now = Date.now();
  const cutoffMsByPeriod: Record<Exclude<TemplatePublicPeriod, 'all'>, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000
  };
  return now - cutoffMsByPeriod[period];
};

const toTimestamp = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    const time = new Date(value ?? 0).getTime();
    if (Number.isFinite(time) && time > 0) return time;
  }
  return 0;
};

const fetchMyTemplates = async (): Promise<TemplateRecord[]> => {
  const res = await apiFetch('/api/v1/templates/me', undefined, { redirectOnAuthFailure: false });
  if (res.status === 401) {
    throw new AuthRequiredError('로그인이 필요합니다.');
  }
  if (!res.ok) {
    throw new Error('내 밈플릿 목록을 불러오지 못했습니다.');
  }
  const payload = (await res.json()) as TemplatesResponse;
  return payload.templates ?? [];
};

const MyTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sortBy, setSortBy] = React.useState<TemplatePublicSortBy>('latest');
  const [period, setPeriod] = React.useState<TemplatePublicPeriod>('all');
  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['templates', 'mine'],
    queryFn: fetchMyTemplates,
  });
  const loginPath = React.useMemo(
    () => buildLoginPath(getPathWithSearchAndHash(location)),
    [location]
  );

  React.useEffect(() => {
    if (error instanceof AuthRequiredError) {
      navigate(loginPath, { replace: true });
    }
  }, [error, loginPath, navigate]);

  const filteredAndSortedTemplates = React.useMemo(() => {
    const cutoffTimestamp = getPeriodCutoffTimestamp(period);
    const filtered = cutoffTimestamp
      ? templates.filter((template) => toTimestamp(template.createdAt, template.updatedAt) >= cutoffTimestamp)
      : templates;
    const next = [...filtered];
    if (sortBy === 'likes') {
      next.sort((a, b) => {
        const likeDiff = (b.likeCount ?? 0) - (a.likeCount ?? 0);
        if (likeDiff !== 0) return likeDiff;
        const viewDiff = (b.viewCount ?? 0) - (a.viewCount ?? 0);
        if (viewDiff !== 0) return viewDiff;
        return toTimestamp(b.updatedAt, b.createdAt) - toTimestamp(a.updatedAt, a.createdAt);
      });
      return next;
    }
    if (sortBy === 'views') {
      next.sort((a, b) => {
        const viewDiff = (b.viewCount ?? 0) - (a.viewCount ?? 0);
        if (viewDiff !== 0) return viewDiff;
        const likeDiff = (b.likeCount ?? 0) - (a.likeCount ?? 0);
        if (likeDiff !== 0) return likeDiff;
        return toTimestamp(b.updatedAt, b.createdAt) - toTimestamp(a.updatedAt, a.createdAt);
      });
      return next;
    }
    next.sort((a, b) => toTimestamp(b.updatedAt, b.createdAt) - toTimestamp(a.updatedAt, a.createdAt));
    return next;
  }, [templates, sortBy, period]);

  return (
    <MySectionLayout
      title="내 밈플릿"
    >
      {isLoading ? (
        <TemplateCardSkeletonGrid count={6} minItemWidth={240} />
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>목록 로딩 실패</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error instanceof Error ? error.message : '내 밈플릿 목록을 불러오지 못했습니다.'}</span>
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </AlertDescription>
        </Alert>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="mb-3 text-sm text-muted-foreground">저장된 밈플릿이 없습니다.</p>
          <Button type="button" variant="outline" onClick={() => navigate('/create')}>
            첫 밈플릿 만들기
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
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
          {filteredAndSortedTemplates.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">선택한 기간에 해당하는 밈플릿이 없습니다.</p>
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
            >
              {filteredAndSortedTemplates.map((template) => (
                <TemplateThumbnailCard
                  key={template.id}
                  template={template}
                  hoverable
                  hoverSurfaceOnly
                  onClick={() => navigate(`/templates/s/${template.shareSlug}`)}
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
        </>
      )}
    </MySectionLayout>
  );
};

export default MyTemplatesPage;
