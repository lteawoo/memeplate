import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Layout, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import MainHeader from '../components/layout/MainHeader';
import TemplateThumbnailCard from '../components/TemplateThumbnailCard';
import type { TemplateRecord, TemplatesResponse } from '../types/template';

const { Content } = Layout;
const { Title, Text } = Typography;

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
      <Content className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <Title level={2} className="!mb-1">밈플릿</Title>
            <Text type="secondary">최신순으로 밈플릿을 확인하고 바로 편집할 수 있습니다.</Text>
          </div>
          <Button type="primary" onClick={() => navigate('/create')}>새로 만들기</Button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center"><Spin size="large" /></div>
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
                    <span className="truncate">작성자 {template.ownerDisplayName || '-'}</span>
                    <span className="shrink-0">조회 {(template.viewCount ?? 0).toLocaleString()} · 좋아요 {(template.likeCount ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </TemplateThumbnailCard>
            ))}
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default TemplatesPage;
