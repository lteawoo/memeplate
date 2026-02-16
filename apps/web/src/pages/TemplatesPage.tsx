import React from 'react';
import { Button, Empty, Layout, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import MainHeader from '../components/layout/MainHeader';
import TemplateThumbnailCard from '../components/TemplateThumbnailCard';
import type { TemplateRecord, TemplatesResponse } from '../types/template';

const { Content } = Layout;
const { Title, Text } = Typography;

const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = React.useState<TemplateRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/v1/templates/public?limit=50');
        if (!res.ok) throw new Error('밈플릿 목록 로딩 실패');
        const payload = (await res.json()) as TemplatesResponse;
        setTemplates(payload.templates ?? []);
      } catch {
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <Layout className="min-h-screen bg-white">
      <MainHeader />
      <Content className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <Title level={2} className="!mb-1">공개 밈플릿</Title>
            <Text type="secondary">최신순으로 공개 밈플릿을 확인하고 바로 편집할 수 있습니다.</Text>
          </div>
          <Button type="primary" onClick={() => navigate('/create')}>새로 만들기</Button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center"><Spin size="large" /></div>
        ) : templates.length === 0 ? (
          <Empty description="공개 밈플릿이 없습니다." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <TemplateThumbnailCard
                key={template.id}
                template={template}
                hoverable
                showMeta
                actions={[
                  <Button key="view" type="link" onClick={() => navigate(`/templates/s/${template.shareSlug}`)}>상세 보기</Button>,
                  <Button key="edit" type="link" onClick={() => navigate(`/create?shareSlug=${template.shareSlug}`)}>이 밈플릿 사용</Button>
                ]}
              />
            ))}
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default TemplatesPage;
