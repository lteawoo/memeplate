import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Layout, Skeleton, Typography } from 'antd';
import { EyeOutlined, HeartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import MainHeader from '../components/layout/MainHeader';
import PageContainer from '../components/layout/PageContainer';
import TemplateThumbnailCard from '../components/TemplateThumbnailCard';
import type { TemplateRecord, TemplatesResponse } from '../types/template';

const { Title, Text } = Typography;
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
    refetch
  } = useQuery({
    queryKey: ['templates', 'public', 50],
    queryFn: fetchPublicTemplates
  });

  return (
    <Layout className="min-h-screen bg-white">
      <MainHeader />
      <PageContainer className="py-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <Title level={2} className="!mb-1">밈플릿 목록</Title>
            <Text type="secondary">텍스트 레이어를 채워 쓸 수 있는 밈플릿을 최신순으로 확인합니다.</Text>
          </div>
          <Button type="primary" onClick={() => navigate('/create')}>새로 만들기</Button>
        </div>

        {isLoading ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
          >
            {SKELETON_ITEMS.map((key) => (
              <div key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="h-52 border-b border-slate-100 bg-slate-100 p-3">
                  <div className="h-full w-full animate-pulse rounded-lg bg-gradient-to-br from-slate-100 to-slate-200" />
                </div>
                <div className="space-y-3 p-4">
                  <Skeleton.Input active size="small" block />
                  <div className="flex items-center gap-3">
                    <Skeleton.Input active size="small" className="!w-full !min-w-0 !flex-1" />
                    <Skeleton.Input active size="small" className="!w-full !min-w-0 !flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <Empty
            description={error instanceof Error ? error.message : '밈플릿 목록을 불러오지 못했습니다.'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button onClick={() => void refetch()}>다시 시도</Button>
          </Empty>
        ) : templates.length === 0 ? (
          <Empty description="밈플릿이 없습니다." />
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
                onClick={() => navigate(`/templates/s/${template.shareSlug}`)}
              >
                <div className="space-y-2">
                  <div className="line-clamp-1 text-sm font-semibold text-slate-900">{template.title}</div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">{template.ownerDisplayName || '-'}</span>
                    <span className="shrink-0 inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <EyeOutlined />
                        {(template.viewCount ?? 0).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <HeartOutlined />
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
    </Layout>
  );
};

export default TemplatesPage;
