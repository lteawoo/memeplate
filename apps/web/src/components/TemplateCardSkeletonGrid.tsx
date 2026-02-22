import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

type TemplateCardSkeletonGridProps = {
  count?: number;
  minItemWidth?: number;
};

const TemplateCardSkeletonGrid: React.FC<TemplateCardSkeletonGridProps> = ({ count = 6, minItemWidth = 240 }) => {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth}px, 1fr))` }}>
      {Array.from({ length: count }, (_, idx) => (
        <div key={idx} className="overflow-hidden rounded-xl border border-transparent bg-transparent shadow-none">
          <div className="thumb-card-surface h-52 w-full bg-transparent p-0">
            <div className="thumb-card-media-surface relative flex h-full items-center justify-center overflow-hidden rounded-lg bg-transparent">
              <Skeleton className="absolute inset-0 rounded-lg bg-border/70" />
            </div>
          </div>
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-full rounded bg-border/80" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 flex-1 rounded bg-border/70" />
              <Skeleton className="h-4 flex-1 rounded bg-border/70" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplateCardSkeletonGrid;
