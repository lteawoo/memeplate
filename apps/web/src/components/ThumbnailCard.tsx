import React from 'react';
import { Card } from 'antd';

interface ThumbnailCardProps {
  imageUrl?: string;
  title: string;
  hoverable?: boolean;
  actions?: React.ReactNode[];
  children?: React.ReactNode;
  onClick?: () => void;
  fallbackText?: string;
}

const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  imageUrl,
  title,
  hoverable = false,
  actions,
  children,
  onClick,
  fallbackText = 'No Image'
}) => {
  const isClickable = Boolean(onClick);
  const [hasImageError, setHasImageError] = React.useState(false);

  React.useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

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
      cover={(
        <div className="h-52 w-full border-b border-slate-100 bg-slate-50 p-3">
          {imageUrl && !hasImageError ? (
            <div className="flex h-full items-center justify-center overflow-hidden rounded-lg">
              <img
                src={imageUrl}
                alt={title}
                crossOrigin="anonymous"
                onError={() => setHasImageError(true)}
                className="max-h-full w-full object-contain"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-400">
              {fallbackText}
            </div>
          )}
        </div>
      )}
    >
      {children}
    </Card>
  );
};

export default ThumbnailCard;
