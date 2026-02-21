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
        <div key={idx} className="overflow-hidden rounded-xl border border-transparent bg-transparent">
          <div className="h-52 p-2">
            <Skeleton className="h-full w-full rounded-lg bg-muted" />
          </div>
          <div className="space-y-2 p-3">
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
