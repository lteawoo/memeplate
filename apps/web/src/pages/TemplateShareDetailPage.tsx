import React from 'react';
import { Alert, Button, Card, Layout, Spin, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import MainHeader from '../components/layout/MainHeader';
import type { TemplateResponse, TemplateRecord } from '../types/template';

const { Content } = Layout;
const { Title, Text } = Typography;

const TemplateShareDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const [template, setTemplate] = React.useState<TemplateRecord | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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

  return (
    <Layout className="min-h-screen bg-white">
      <MainHeader />
      <Content className="mx-auto w-full max-w-4xl px-6 py-10">
        {isLoading ? (
          <div className="py-20 text-center"><Spin size="large" /></div>
        ) : error ? (
          <Alert type="error" message={error} />
        ) : template ? (
          <Card className="rounded-2xl">
            <div className="mb-6">
              <Title level={2} className="!mb-2">{template.title}</Title>
              <Text type="secondary">공유 밈플릿을 불러와서 바로 편집할 수 있습니다.</Text>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {template.thumbnailUrl ? (
                <img src={template.thumbnailUrl} alt={template.title} className="w-full object-contain" />
              ) : (
                <div className="h-80 flex items-center justify-center text-slate-400">미리보기 없음</div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="primary" onClick={() => navigate(`/create?shareSlug=${template.shareSlug}`)}>
                이 밈플릿으로 시작
              </Button>
              <Button onClick={() => navigate('/templates')}>목록으로</Button>
            </div>
          </Card>
        ) : null}
      </Content>
    </Layout>
  );
};

export default TemplateShareDetailPage;
