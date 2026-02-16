import React from 'react';
import { Alert, Button, Card, Empty, Popconfirm, Segmented, Spin, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import MySectionLayout from '../components/layout/MySectionLayout';
import type { TemplateRecord, TemplatesResponse, TemplateVisibility } from '../types/template';

const { Title, Text } = Typography;

const MyTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [templates, setTemplates] = React.useState<TemplateRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadTemplates = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/templates/me', { credentials: 'include' });
      if (res.status === 401) {
        setError('로그인이 필요합니다.');
        setTemplates([]);
        return;
      }
      if (!res.ok) {
        throw new Error('내 밈플릿 목록을 불러오지 못했습니다.');
      }
      const payload = (await res.json()) as TemplatesResponse;
      setTemplates(payload.templates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '내 밈플릿 목록을 불러오지 못했습니다.');
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const updateVisibility = async (templateId: string, visibility: TemplateVisibility) => {
    const res = await fetch(`/api/v1/templates/${templateId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(payload.message || '공개 상태 변경에 실패했습니다.');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    const res = await fetch(`/api/v1/templates/${templateId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(payload.message || '밈플릿 삭제에 실패했습니다.');
    }
  };

  return (
    <MySectionLayout
      title="내 밈플릿 관리"
      description="공개 여부를 변경하고, 공유 링크를 복사하거나 삭제할 수 있습니다."
      action={<Button type="primary" onClick={() => navigate('/create')}>새 밈플릿 만들기</Button>}
    >
      {contextHolder}
      {isLoading ? (
        <div className="py-20 text-center"><Spin size="large" /></div>
      ) : error ? (
        <Alert type="error" message={error} />
      ) : templates.length === 0 ? (
        <Empty description="저장된 밈플릿이 없습니다." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              cover={
                template.thumbnailUrl ? (
                  <img src={template.thumbnailUrl} alt={template.title} className="h-48 w-full object-cover" />
                ) : (
                  <div className="h-48 w-full bg-slate-100 flex items-center justify-center text-slate-400">
                    No Preview
                  </div>
                )
              }
            >
              <div className="flex flex-col gap-3">
                <div>
                  <Title level={5} className="!mb-1">{template.title}</Title>
                  <Text type="secondary" className="text-xs">
                    {template.updatedAt ? `업데이트: ${new Date(template.updatedAt).toLocaleString()}` : ''}
                  </Text>
                </div>

                <Segmented
                  value={template.visibility}
                  options={[
                    { label: '비공개', value: 'private' },
                    { label: '공개', value: 'public' }
                  ]}
                  onChange={(value) => {
                    void updateVisibility(template.id, value as TemplateVisibility)
                      .then(() => {
                        messageApi.success('공개 상태를 변경했습니다.');
                        setTemplates((prev) => prev.map((item) => (
                          item.id === template.id ? { ...item, visibility: value as TemplateVisibility } : item
                        )));
                      })
                      .catch((err: unknown) => {
                        messageApi.error(err instanceof Error ? err.message : '공개 상태 변경에 실패했습니다.');
                      });
                  }}
                  block
                />

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => navigate(`/create?templateId=${template.id}`)}>편집</Button>
                  <Button
                    disabled={template.visibility !== 'public'}
                    onClick={() => {
                      const url = `${window.location.origin}/templates/s/${template.shareSlug}`;
                      void navigator.clipboard.writeText(url)
                        .then(() => messageApi.success('공유 링크를 복사했습니다.'))
                        .catch(() => messageApi.error('링크 복사에 실패했습니다.'));
                    }}
                  >
                    링크 복사
                  </Button>
                  <Popconfirm
                    title="밈플릿 삭제"
                    description="삭제 후 복구할 수 없습니다."
                    okText="삭제"
                    cancelText="취소"
                    onConfirm={() => {
                      void deleteTemplate(template.id)
                        .then(() => {
                          messageApi.success('밈플릿을 삭제했습니다.');
                          setTemplates((prev) => prev.filter((item) => item.id !== template.id));
                        })
                        .catch((err: unknown) => {
                          messageApi.error(err instanceof Error ? err.message : '밈플릿 삭제에 실패했습니다.');
                        });
                    }}
                  >
                    <Button danger>삭제</Button>
                  </Popconfirm>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </MySectionLayout>
  );
};

export default MyTemplatesPage;
