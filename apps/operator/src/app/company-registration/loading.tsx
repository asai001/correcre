import { SkeletonBlock, SkeletonTableCard } from "@operator/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-5">
      <SkeletonBlock className="h-24 rounded-[28px]" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <SkeletonBlock className="h-[720px]" />
        <SkeletonTableCard rowCount={4} className="min-h-[720px]" />
      </div>
    </div>
  );
}
