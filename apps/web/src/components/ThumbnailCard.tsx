import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ThumbnailCardProps {
  imageUrl?: string;
  title: string;
  hoverable?: boolean;
  hoverSurfaceOnly?: boolean;
  actions?: React.ReactNode[];
  children?: React.ReactNode;
  onClick?: () => void;
  fallbackText?: string;
}

const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  imageUrl,
  title,
  hoverable = false,
  hoverSurfaceOnly = false,
  actions,
  children,
  onClick,
  fallbackText = 'No Image'
}) => {
  const isClickable = Boolean(onClick);
  const [hasImageError, setHasImageError] = React.useState(false);
  const [hasImageLoaded, setHasImageLoaded] = React.useState(false);
  const imageRef = React.useRef<HTMLImageElement | null>(null);

  React.useEffect(() => {
    setHasImageError(false);
    const imageEl = imageRef.current;
    if (imageEl && imageEl.complete && imageEl.naturalWidth > 0) {
      setHasImageLoaded(true);
      return;
    }
    setHasImageLoaded(false);
  }, [imageUrl]);

  return (
    <Card
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
      className={`overflow-hidden rounded-xl border border-transparent bg-transparent shadow-none ${hoverSurfaceOnly ? 'hover-surface-only-card' : ''} ${isClickable ? 'cursor-pointer' : ''} ${
        hoverable ? 'transition-shadow hover:shadow-[0_6px_14px_rgba(13,27,42,0.08)]' : ''
      }`}
    >
      <div className="thumb-card-surface h-52 w-full bg-transparent p-0">
        {imageUrl && !hasImageError ? (
          <div className="thumb-card-media-surface relative flex h-full items-center justify-center overflow-hidden rounded-lg bg-transparent">
            {!hasImageLoaded ? (
              <Skeleton className="absolute inset-0 rounded-lg bg-border/70" />
            ) : null}
            <img
              ref={imageRef}
              key={imageUrl}
              src={imageUrl}
              alt={title}
              crossOrigin="anonymous"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              onLoad={() => {
                setHasImageError(false);
                setHasImageLoaded(true);
              }}
              onError={() => {
                setHasImageLoaded(false);
                setHasImageError(true);
              }}
              className={`max-h-full w-full object-contain transition-opacity duration-200 ${hasImageLoaded ? 'opacity-100' : 'opacity-0'}`}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            {fallbackText}
          </div>
        )}
      </div>
      <CardContent className="p-[10px_12px]">
        {children}
      </CardContent>
      {actions?.length ? (
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          {actions.map((action, index) => (
            <React.Fragment key={index}>{action}</React.Fragment>
          ))}
        </div>
      ) : null}
    </Card>
  );
};

export default ThumbnailCard;
