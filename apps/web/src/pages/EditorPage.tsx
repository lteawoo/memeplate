import React from 'react';
import { Alert, Spin } from 'antd';
import { useSearchParams } from 'react-router-dom';
import MemeEditor from '../components/MemeEditor';
import type { TemplateResponse, TemplateRecord } from '../types/template';
type EditorLoadMode = 'mine' | 'public';

const EditorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const shareSlug = searchParams.get('shareSlug');
  const [template, setTemplate] = React.useState<TemplateRecord | null>(null);
  const [templateMode, setTemplateMode] = React.useState<EditorLoadMode | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId && !shareSlug) {
        setTemplate(null);
        setTemplateMode(undefined);
        setLoadError(null);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      const endpoint = templateId
        ? `/api/v1/templates/${templateId}`
        : `/api/v1/templates/s/${shareSlug}`;

      try {
        const res = await fetch(endpoint, {
          credentials: templateId ? 'include' : 'same-origin'
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || '밈플릿을 불러오지 못했습니다.');
        }
        const payload = (await res.json()) as TemplateResponse;
        setTemplate(payload.template);

        if (templateId) {
          setTemplateMode('mine');
          return;
        }
        setTemplateMode('public');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '밈플릿을 불러오지 못했습니다.';
        setLoadError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    void loadTemplate();
  }, [shareSlug, templateId]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <Spin size="large" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen w-full p-8 bg-white">
        <Alert type="error" message={loadError} />
      </div>
    );
  }

  return (
    <MemeEditor
      initialTemplate={template}
      initialTemplateMode={templateMode}
    />
  );
};

export default EditorPage;
