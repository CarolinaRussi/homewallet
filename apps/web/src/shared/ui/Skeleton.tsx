type SkeletonProps = {
  className?: string;
};

/** Pulsing block for loading placeholders. Size via className (`h-4 w-24`, etc.). */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div aria-hidden className={`hw-skeleton rounded-md ${className}`} />;
}

export function SummaryCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-28" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ListRowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function PotGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-7 w-24" />
          <Skeleton className="mt-3 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SpaceCardsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 md:p-6"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="mt-2 h-3 w-full max-w-md" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}
