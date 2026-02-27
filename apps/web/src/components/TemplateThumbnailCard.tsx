import React from 'react';
import { formatDateTimeLabel } from '@/lib/dateFormat';
import type { TemplateRecord } from '../types/template';
import ThumbnailCard from './ThumbnailCard';

interface TemplateThumbnailCardProps {
  template: TemplateRecord;
  hoverable?: boolean;
  hoverSurfaceOnly?: boolean;
  actions?: React.ReactNode[];
  showMeta?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}

const TemplateThumbnailCard: React.FC<TemplateThumbnailCardProps> = ({
  template,
  hoverable = false,
  hoverSurfaceOnly = false,
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
      hoverSurfaceOnly={hoverSurfaceOnly}
      actions={actions}
      onClick={onClick}
    >
      {showMeta ? (
        <div className="space-y-1">
          <div className="line-clamp-1 text-sm font-semibold text-foreground">{template.title}</div>
          {template.updatedAt ? (
            <p className="text-xs text-muted-foreground">업데이트: {formatDateTimeLabel(template.updatedAt)}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </ThumbnailCard>
  );
};

export default TemplateThumbnailCard;
