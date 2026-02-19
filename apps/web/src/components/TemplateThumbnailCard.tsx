import React from 'react';
import type { TemplateRecord } from '../types/template';
import ThumbnailCard from './ThumbnailCard';

interface TemplateThumbnailCardProps {
  template: TemplateRecord;
  hoverable?: boolean;
  actions?: React.ReactNode[];
  showMeta?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}

const TemplateThumbnailCard: React.FC<TemplateThumbnailCardProps> = ({
  template,
  hoverable = false,
  actions,
  showMeta = false,
  children,
  onClick
}) => {
  return (
    <ThumbnailCard
      imageUrl={template.thumbnailUrl}
      title={template.title}
      hoverable={hoverable}
      actions={actions}
      onClick={onClick}
    >
      {showMeta ? (
        <div className="space-y-1">
          <div className="line-clamp-1 text-sm font-semibold text-slate-900">{template.title}</div>
          {template.updatedAt ? (
            <p className="text-xs text-slate-500">업데이트: {new Date(template.updatedAt).toLocaleString()}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </ThumbnailCard>
  );
};

export default TemplateThumbnailCard;
