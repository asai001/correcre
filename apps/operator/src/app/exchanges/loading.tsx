import { SkeletonBlock, SkeletonCardGrid } from "@operator/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-10">
      <SkeletonBlock className="h-24 rounded-[28px]" />
      <SkeletonCardGrid count={3} itemClassName="h-28" className="md:grid-cols-3" />
      <SkeletonCardGrid count={5} itemClassName="h-24" className="md:grid-cols-1" />
    </div>
  );
}
