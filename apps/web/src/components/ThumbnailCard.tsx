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
  const [hasImageLoaded, setHasImageLoaded] = React.useState(false);

  React.useEffect(() => {
    setHasImageError(false);
    setHasImageLoaded(false);
  }, [imageUrl]);

  return (
    <Card
      hoverable={hoverable}
      bordered={false}
      actions={actions}
      styles={{ body: { padding: '10px 12px' } }}
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
        <div className="h-52 w-full bg-slate-50 p-2">
          {imageUrl && !hasImageError ? (
            <div className="relative flex h-full items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              {!hasImageLoaded ? (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
              ) : null}
              <img
                src={imageUrl}
                alt={title}
                crossOrigin="anonymous"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                onLoad={() => setHasImageLoaded(true)}
                onError={() => setHasImageError(true)}
                className={`max-h-full w-full object-contain transition-opacity duration-200 ${hasImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-500">
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
