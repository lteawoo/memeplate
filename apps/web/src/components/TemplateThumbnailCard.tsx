import React from 'react';
import { Card } from 'antd';
import type { TemplateRecord } from '../types/template';

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
  const isClickable = Boolean(onClick);

  return (
    <Card
      hoverable={hoverable}
      actions={actions}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={isClickable ? 'cursor-pointer' : undefined}
      cover={
        <div className="h-52 w-full border-b border-slate-100 bg-slate-50 p-3">
          {template.thumbnailUrl ? (
            <div className="flex h-full items-center justify-center overflow-hidden rounded-lg">
              <img
                src={template.thumbnailUrl}
                alt={template.title}
                crossOrigin="anonymous"
                className="max-h-full w-full object-contain"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-400">
              No Preview
            </div>
          )}
        </div>
      }
    >
      {showMeta ? (
        <Card.Meta
          title={template.title}
          description={template.updatedAt ? `업데이트: ${new Date(template.updatedAt).toLocaleString()}` : ''}
        />
      ) : null}
      {children}
    </Card>
  );
};

export default TemplateThumbnailCard;
