import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type PreviewFrameProps = {
  imageUrl?: string;
  alt: string;
  loadingPlaceholder?: boolean;
  imageRef?: React.RefObject<HTMLImageElement | null>;
  imageKey?: string;
  isImageLoaded?: boolean;
  isImageError?: boolean;
  maxImageHeightClassName?: string;
  frameClassName?: string;
  contentClassName?: string;
  emptyClassName?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  onLoad?: () => void;
  onError?: () => void;
  emptyText?: string;
  errorText?: string;
};

const PreviewFrame: React.FC<PreviewFrameProps> = ({
  imageUrl,
  alt,
  loadingPlaceholder = false,
  imageRef,
  imageKey,
  isImageLoaded,
  isImageError = false,
  maxImageHeightClassName = 'max-h-[360px]',
  frameClassName,
  contentClassName,
  emptyClassName,
  loading = 'eager',
  fetchPriority = 'high',
  onLoad,
  onError,
  emptyText = '미리보기 없음',
  errorText = '미리보기를 불러오지 못했습니다.',
}) => {
  const hasLoadState = typeof isImageLoaded === 'boolean';
  const showSkeleton = hasLoadState && !isImageLoaded && !isImageError;
  const imageOpacityClass = hasLoadState ? (isImageLoaded ? 'opacity-100' : 'opacity-0') : 'opacity-100';
  const showLoadingPlaceholder = loadingPlaceholder && !imageUrl;

  return (
    <div className={cn('overflow-hidden rounded-xl bg-transparent', frameClassName)}>
      {showLoadingPlaceholder ? (
        <div className={cn('relative flex items-center justify-center p-4', contentClassName)}>
          <Skeleton className="absolute inset-0 rounded-lg bg-border/70" />
        </div>
      ) : imageUrl ? (
        <div className={cn('relative flex items-center justify-center p-4', contentClassName)}>
          {showSkeleton ? (
            <Skeleton className="absolute inset-0 rounded-lg bg-border/70" />
          ) : null}
          <img
            ref={imageRef}
            key={imageKey}
            src={imageUrl}
            alt={alt}
            crossOrigin="anonymous"
            loading={loading}
            decoding="async"
            fetchPriority={fetchPriority}
            onLoad={onLoad}
            onError={onError}
            className={cn(
              'w-full object-contain transition-opacity duration-200',
              maxImageHeightClassName,
              imageOpacityClass,
            )}
          />
          {isImageError ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              {errorText}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={cn('flex h-56 items-center justify-center text-muted-foreground', emptyClassName)}>
          {emptyText}
        </div>
      )}
    </div>
  );
};

export default PreviewFrame;
