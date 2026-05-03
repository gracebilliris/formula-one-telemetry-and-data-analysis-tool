interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 bg-[length:200%_100%] rounded-md ${className}`}
    style={{ animation: 'shimmer 1.6s ease-in-out infinite' }}
  />
);

interface ChartSkeletonProps {
  title?: string;
  height?: number;
}

export const ChartSkeleton = ({ title = 'Loading data…', height = 280 }: ChartSkeletonProps) => (
  <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur p-6 space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-5 bg-gradient-to-b from-red-600 to-red-500 rounded-full" />
      <Skeleton className="h-5 w-40" />
    </div>
    <Skeleton className="h-3 w-64" />
    <div className="flex items-end gap-2 pt-4" style={{ height }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="flex-1" style={{ height: `${30 + ((i * 17) % 70)}%` }}>
          <Skeleton className="w-full h-full" />
        </div>
      ))}
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{title}</p>
  </div>
);
