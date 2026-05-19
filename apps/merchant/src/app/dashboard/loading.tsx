import { SkeletonBlock, SkeletonCardGrid } from "@merchant/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-5">
      <SkeletonBlock className="h-24 rounded-[28px]" />
      <SkeletonCardGrid count={2} itemClassName="h-64" className="lg:grid-cols-2" />
    </div>
  );
}
