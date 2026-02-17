import React from 'react';
import { Card } from 'antd';
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
        <Card.Meta
          title={template.title}
          description={template.updatedAt ? `업데이트: ${new Date(template.updatedAt).toLocaleString()}` : ''}
        />
      ) : null}
      {children}
    </ThumbnailCard>
  );
};

export default TemplateThumbnailCard;
