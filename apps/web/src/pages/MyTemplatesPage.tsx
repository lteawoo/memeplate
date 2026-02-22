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
import type { TemplateRecord, TemplatesResponse } from '../types/template';
import { apiFetch } from '../lib/apiFetch';

class AuthRequiredError extends Error {}

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
    </MySectionLayout>
  );
};

export default MyTemplatesPage;
