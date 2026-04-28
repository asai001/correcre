import { SkeletonBlock, SkeletonCardGrid } from "@merchant/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-10">
      <SkeletonBlock className="h-24 rounded-[28px]" />
      <SkeletonCardGrid count={4} itemClassName="h-72" className="md:grid-cols-2" />
    </div>
  );
}
