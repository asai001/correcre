import { SkeletonBlock, SkeletonCardGrid, SkeletonTableCard } from "@operator/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-5">
      <SkeletonBlock className="h-24 rounded-[28px]" />
      <SkeletonBlock className="h-40 rounded-[28px]" />
      <SkeletonBlock className="h-32 rounded-[28px]" />
      <SkeletonCardGrid count={4} itemClassName="h-40" className="xl:grid-cols-4" />
      <SkeletonTableCard rowCount={6} />
    </div>
  );
}
