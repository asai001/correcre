import { SkeletonBlock, SkeletonCardGrid, SkeletonTableCard } from "@admin/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-5 pb-5">
      <SkeletonBlock className="h-24 rounded-[28px]" />
      <SkeletonBlock className="h-16 rounded-[28px]" />
      <SkeletonCardGrid count={4} itemClassName="h-32" className="xl:grid-cols-4" />
      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonBlock className="h-[360px]" />
        <SkeletonBlock className="h-[360px]" />
      </div>
      <SkeletonTableCard rowCount={6} />
    </div>
  );
}
