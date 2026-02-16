import React from 'react';
import { Alert, Button, Card, Layout, Spin, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import MainHeader from '../components/layout/MainHeader';
import type { TemplateResponse, TemplateRecord } from '../types/template';

const { Content } = Layout;
const { Title, Text } = Typography;

type ImageMeta = {
  format: string;
  resolution: string;
  fileSize: string;
};

const toProxyImageUrl = (url: string) => `/api/v1/assets/proxy?url=${encodeURIComponent(url)}`;

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatMimeToLabel = (contentType: string | null, fallbackUrl?: string) => {
  if (contentType?.includes('/')) {
    return contentType.split('/')[1].toUpperCase();
  }
  if (!fallbackUrl) return '-';
  const ext = fallbackUrl.split('?')[0].split('.').pop();
  return ext ? ext.toUpperCase() : '-';
};

const TemplateShareDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const [template, setTemplate] = React.useState<TemplateRecord | null>(null);
  const [imageMeta, setImageMeta] = React.useState<ImageMeta>({
    format: '-',
    resolution: '-',
    fileSize: '-'
  });
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

  React.useEffect(() => {
    const loadImageMeta = async () => {
      if (!template?.thumbnailUrl) {
        setImageMeta({ format: '-', resolution: '-', fileSize: '-' });
        return;
      }

      const proxiedUrl = toProxyImageUrl(template.thumbnailUrl);

      try {
        const [imageInfo, response] = await Promise.all([
          new Promise<{ width: number; height: number }>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
            image.onerror = reject;
            image.src = proxiedUrl;
          }),
          fetch(proxiedUrl)
        ]);

        const blob = await response.blob();
        const format = formatMimeToLabel(response.headers.get('content-type'), template.thumbnailUrl);
        setImageMeta({
          format,
          resolution: `${imageInfo.width} x ${imageInfo.height}`,
          fileSize: formatBytes(blob.size)
        });
      } catch {
        setImageMeta({
          format: formatMimeToLabel(null, template.thumbnailUrl),
          resolution: '-',
          fileSize: '-'
        });
      }
    };

    void loadImageMeta();
  }, [template]);

  return (
    <Layout className="min-h-screen bg-white">
      <MainHeader />
      <Content className="mx-auto w-full max-w-6xl px-6 py-10">
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {template.thumbnailUrl ? (
                  <div className="flex items-center justify-center p-4">
                    <img
                      src={template.thumbnailUrl}
                      alt={template.title}
                      className="max-h-[640px] w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-slate-400">미리보기 없음</div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-4 text-base font-semibold text-slate-900">상세 정보</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">만든 사람</span>
                    <span className="text-right font-medium text-slate-800">
                      {template.ownerDisplayName || template.ownerId || '-'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">생성일</span>
                    <span className="text-right font-medium text-slate-800">
                      {template.createdAt ? new Date(template.createdAt).toLocaleString() : '-'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">이미지 포맷</span>
                    <span className="text-right font-medium text-slate-800">{imageMeta.format}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">해상도</span>
                    <span className="text-right font-medium text-slate-800">{imageMeta.resolution}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">파일 사이즈</span>
                    <span className="text-right font-medium text-slate-800">{imageMeta.fileSize}</span>
                  </div>
                </div>
              </div>
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
