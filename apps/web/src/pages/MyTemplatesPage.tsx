import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Drawer, Empty, Popconfirm, Segmented, Spin, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import MySectionLayout from '../components/layout/MySectionLayout';
import TemplateThumbnailCard from '../components/TemplateThumbnailCard';
import type { TemplateRecord, TemplatesResponse, TemplateVisibility } from '../types/template';
import { apiFetch } from '../lib/apiFetch';

const { Title } = Typography;

type ImageMeta = {
  format: string;
  resolution: string;
  fileSize: string;
};

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
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [detailTarget, setDetailTarget] = React.useState<TemplateRecord | null>(null);
  const [detailMetaLoading, setDetailMetaLoading] = React.useState(false);
  const [detailMeta, setDetailMeta] = React.useState<ImageMeta>({
    format: '-',
    resolution: '-',
    fileSize: '-'
  });

  const {
    data: templates = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['templates', 'mine'],
    queryFn: fetchMyTemplates
  });

  React.useEffect(() => {
    if (error instanceof AuthRequiredError) {
      navigate('/');
    }
  }, [error, navigate]);

  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ templateId, visibility }: { templateId: string; visibility: TemplateVisibility }) => {
      const res = await apiFetch(`/api/v1/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '공개 상태 변경에 실패했습니다.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['templates', 'mine'] });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiFetch(`/api/v1/templates/${templateId}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || '밈플릿 삭제에 실패했습니다.');
      }
    },
    onSuccess: async (_data, templateId) => {
      if (detailTarget?.id === templateId) {
        setDetailTarget(null);
      }
      await queryClient.invalidateQueries({ queryKey: ['templates', 'mine'] });
    }
  });

  React.useEffect(() => {
    const loadDetailMeta = async () => {
      if (!detailTarget?.thumbnailUrl) {
        setDetailMeta({ format: '-', resolution: '-', fileSize: '-' });
        return;
      }

      setDetailMetaLoading(true);
      try {
        const [imageInfo, response] = await Promise.all([
          new Promise<{ width: number; height: number }>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
            image.onerror = reject;
            image.src = detailTarget.thumbnailUrl;
          }),
          fetch(detailTarget.thumbnailUrl)
        ]);

        const blob = await response.blob();
        setDetailMeta({
          format: formatMimeToLabel(response.headers.get('content-type'), detailTarget.thumbnailUrl),
          resolution: `${imageInfo.width} x ${imageInfo.height}`,
          fileSize: formatBytes(blob.size)
        });
      } catch {
        setDetailMeta({
          format: formatMimeToLabel(null, detailTarget.thumbnailUrl),
          resolution: '-',
          fileSize: '-'
        });
      } finally {
        setDetailMetaLoading(false);
      }
    };

    void loadDetailMeta();
  }, [detailTarget]);

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
        <Alert type="error" message={error instanceof Error ? error.message : '내 밈플릿 목록을 불러오지 못했습니다.'} />
      ) : templates.length === 0 ? (
        <Empty description="저장된 밈플릿이 없습니다." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <TemplateThumbnailCard
              key={template.id}
              template={template}
            >
              <div className="flex flex-col gap-3">
                <div>
                  <Title level={5} className="!mb-1">{template.title}</Title>
                  <p className="m-0 text-xs text-slate-500">
                    {template.updatedAt ? `업데이트: ${new Date(template.updatedAt).toLocaleString()}` : ''}
                  </p>
                </div>

                <Segmented
                  value={template.visibility}
                  options={[
                    { label: '비공개', value: 'private' },
                    { label: '공개', value: 'public' }
                  ]}
                  disabled={updateVisibilityMutation.isPending}
                  onChange={(value) => {
                    void updateVisibilityMutation.mutateAsync({
                      templateId: template.id,
                      visibility: value as TemplateVisibility
                    })
                      .then(() => {
                        messageApi.success('공개 상태를 변경했습니다.');
                      })
                      .catch((err: unknown) => {
                        messageApi.error(err instanceof Error ? err.message : '공개 상태 변경에 실패했습니다.');
                      });
                  }}
                  block
                />

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setDetailTarget(template)}>상세정보</Button>
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
                      void deleteTemplateMutation.mutateAsync(template.id)
                        .then(() => {
                          messageApi.success('밈플릿을 삭제했습니다.');
                        })
                        .catch((err: unknown) => {
                          messageApi.error(err instanceof Error ? err.message : '밈플릿 삭제에 실패했습니다.');
                        });
                    }}
                  >
                    <Button danger loading={deleteTemplateMutation.isPending}>삭제</Button>
                  </Popconfirm>
                </div>
              </div>
            </TemplateThumbnailCard>
          ))}
        </div>
      )}
      <Drawer
        title={detailTarget ? `${detailTarget.title} 상세정보` : '상세정보'}
        placement="right"
        size={420}
        onClose={() => setDetailTarget(null)}
        open={Boolean(detailTarget)}
      >
        {detailTarget ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {detailTarget.thumbnailUrl ? (
                <div className="flex items-center justify-center p-3">
                  <img
                    src={detailTarget.thumbnailUrl}
                    alt={detailTarget.title}
                    crossOrigin="anonymous"
                    className="max-h-[360px] w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-slate-500">미리보기 없음</div>
              )}
            </div>
            {detailMetaLoading ? (
              <div className="py-6 text-center"><Spin /></div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">만든 사람</span>
                  <span className="text-right font-medium text-slate-800">
                    {detailTarget.ownerDisplayName || detailTarget.ownerId || '-'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">생성일</span>
                  <span className="text-right font-medium text-slate-800">
                    {detailTarget.createdAt ? new Date(detailTarget.createdAt).toLocaleString() : '-'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">이미지 포맷</span>
                  <span className="text-right font-medium text-slate-800">{detailMeta.format}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">해상도</span>
                  <span className="text-right font-medium text-slate-800">{detailMeta.resolution}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">파일 사이즈</span>
                  <span className="text-right font-medium text-slate-800">{detailMeta.fileSize}</span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>
    </MySectionLayout>
  );
};

export default MyTemplatesPage;
