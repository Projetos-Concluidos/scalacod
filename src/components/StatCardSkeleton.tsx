import { cn } from "@/lib/utils";

interface StatCardSkeletonProps {
  className?: string;
}

const StatCardSkeleton = ({ className }: StatCardSkeletonProps) => {
  return (
    <div className={cn("ninja-card flex items-start justify-between animate-pulse", className)}>
      <div className="space-y-3 flex-1">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-8 w-16 rounded bg-muted" />
      </div>
      <div className="h-12 w-12 rounded-xl bg-muted" />
    </div>
  );
};

export default StatCardSkeleton;
