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
import type { TemplateRecord, TemplatesResponse } from '../types/template';

const SKELETON_ITEMS = Array.from({ length: 6 }, (_, idx) => idx);

const fetchPublicTemplates = async (): Promise<TemplateRecord[]> => {
  const res = await fetch('/api/v1/templates/public?limit=50');
  if (!res.ok) {
    throw new Error('밈플릿 목록 로딩 실패');
  }
  const payload = (await res.json()) as TemplatesResponse;
  return payload.templates ?? [];
};

const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['templates', 'public', 50],
    queryFn: fetchPublicTemplates,
  });

  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="py-8">
        {isLoading ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
          >
            {SKELETON_ITEMS.map((key) => (
              <div key={key} className="overflow-hidden rounded-xl border border-transparent bg-transparent">
                <div className="h-52 p-2">
                  <div className="h-full w-full animate-pulse rounded-lg border border-border bg-muted" />
                </div>
                <div className="space-y-2 p-3">
                  <div className="h-4 w-full animate-pulse rounded bg-border/80" />
                  <div className="flex items-center gap-2">
                    <div className="h-4 flex-1 animate-pulse rounded bg-border/70" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-border/70" />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
      </PageContainer>
    </div>
  );
};

export default TemplatesPage;
