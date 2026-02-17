import React from 'react';
import { Alert, Button, Card, Layout, Spin, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import MainHeader from '../components/layout/MainHeader';
import type { MemeImageRecord, MemeImageResponse } from '../types/image';

const { Content } = Layout;
const { Title, Text } = Typography;

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

const ImageShareDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const viewedSlugRef = React.useRef<string | null>(null);
  const [image, setImage] = React.useState<MemeImageRecord | null>(null);
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
        const res = await fetch(`/api/v1/images/s/${shareSlug}`);
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || '이미지를 불러오지 못했습니다.');
        }
        const payload = (await res.json()) as MemeImageResponse;
        setImage(payload.image);
      } catch (err) {
        setError(err instanceof Error ? err.message : '이미지를 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [shareSlug]);

  React.useEffect(() => {
    if (!shareSlug || !image || viewedSlugRef.current === shareSlug) return;

    viewedSlugRef.current = shareSlug;
    const incrementView = async () => {
      try {
        const res = await fetch(`/api/v1/images/s/${shareSlug}/view`, { method: 'POST' });
        if (!res.ok) return;
        const payload = (await res.json().catch(() => ({}))) as { viewCount?: number };
        if (typeof payload.viewCount !== 'number') return;
        setImage((prev) => (prev ? { ...prev, viewCount: payload.viewCount } : prev));
      } catch {
        // 조회수 증가 실패는 상세 화면 흐름을 막지 않는다.
      }
    };
    void incrementView();
  }, [shareSlug, image]);

  return (
    <Layout className="min-h-screen bg-white">
      <MainHeader />
      <Content className="mx-auto w-full max-w-6xl px-6 py-10">
        {isLoading ? (
          <div className="py-20 text-center"><Spin size="large" /></div>
        ) : error ? (
          <Alert type="error" message={error} />
        ) : image ? (
          <Card className="rounded-2xl">
            <div className="mb-6">
              <Title level={2} className="!mb-2">{image.title}</Title>
              <Text type="secondary">공유 이미지를 확인할 수 있습니다.</Text>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-center p-4">
                  <img
                    src={image.imageUrl}
                    alt={image.title}
                    crossOrigin="anonymous"
                    className="max-h-[640px] w-full object-contain"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-4 text-base font-semibold text-slate-900">상세 정보</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">만든 사람</span>
                    <span className="text-right font-medium text-slate-800">
                      {image.ownerDisplayName || image.ownerId || '-'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">생성일</span>
                    <span className="text-right font-medium text-slate-800">
                      {image.createdAt ? new Date(image.createdAt).toLocaleString() : '-'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">이미지 포맷</span>
                    <span className="text-right font-medium text-slate-800">{image.imageMime || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">해상도</span>
                    <span className="text-right font-medium text-slate-800">
                      {image.imageWidth && image.imageHeight ? `${image.imageWidth} x ${image.imageHeight}` : '-'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">파일 사이즈</span>
                    <span className="text-right font-medium text-slate-800">{formatBytes(image.imageBytes ?? 0)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">조회수</span>
                    <span className="text-right font-medium text-slate-800">
                      {(image.viewCount ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">좋아요</span>
                    <span className="text-right font-medium text-slate-800">
                      {(image.likeCount ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="primary" onClick={() => navigate('/create')}>새 밈플릿 만들기</Button>
              <Button onClick={() => navigate('/templates')}>밈플릿 목록으로</Button>
            </div>
          </Card>
        ) : null}
      </Content>
    </Layout>
  );
};

export default ImageShareDetailPage;
