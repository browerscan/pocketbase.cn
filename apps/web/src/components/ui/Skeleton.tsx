import { cn } from "../../lib/utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: "rounded h-4 w-full",
    rectangular: "rounded-md",
    circular: "rounded-full",
  };

  return (
    <div
      className={cn(
        "animate-shimmer bg-neutral-200 dark:bg-neutral-800",
        "bg-[length:200%_100%]",
        "bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200",
        "dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800",
        variantStyles[variant],
        className,
      )}
      style={{ width, height }}
      {...props}
    />
  );
}

interface CardSkeletonProps {
  showAvatar?: boolean;
  lines?: number;
}

export function CardSkeleton({
  showAvatar = false,
  lines = 3,
}: CardSkeletonProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950 sm:p-5">
      {showAvatar && (
        <div className="mb-3 flex items-center gap-3">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" width={120} />
        </div>
      )}
      <Skeleton variant="text" className="mb-2 w-3/4" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} variant="text" className="mb-2" />
      ))}
      <div className="mt-4 flex gap-2">
        <Skeleton variant="rectangular" width={60} height={24} />
        <Skeleton variant="rectangular" width={60} height={24} />
      </div>
    </div>
  );
}

interface GridSkeletonProps {
  count?: number;
  showAvatar?: boolean;
}

export function GridSkeleton({
  count = 6,
  showAvatar = true,
}: GridSkeletonProps) {
  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} showAvatar={showAvatar} />
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <>
      {/* Desktop Table Skeleton */}
      <div className="hidden overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 md:block">
        <div className="bg-neutral-50 p-4 dark:bg-neutral-900">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} variant="text" width={80} />
            ))}
          </div>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4">
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton key={j} variant="text" width={60 + j * 20} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card Skeleton */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: Math.min(rows, 3) }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
          >
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <Skeleton variant="text" width={120} />
              <Skeleton variant="text" className="mt-2" width={80} />
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {Array.from({ length: Math.min(columns - 1, 2) }).map((_, j) => (
                <div key={j} className="flex justify-between px-4 py-3">
                  <Skeleton variant="text" width={60} />
                  <Skeleton variant="text" width={80} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
