import { SkeletonBlock, SkeletonCardGrid } from "@operator/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-5">
      <SkeletonBlock className="h-24 rounded-[28px]" />
      <SkeletonCardGrid count={4} itemClassName="h-40" className="xl:grid-cols-4" />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>
    </div>
  );
}
