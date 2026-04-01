import { SkeletonBlock, SkeletonCardGrid, SkeletonTableCard } from "@employee/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-1 pb-5">
      <SkeletonBlock className="h-24 rounded-[28px]" />
      <div className="container mx-auto px-6">
        <div className="mt-5">
          <SkeletonBlock className="h-24" />
        </div>
        <div className="mt-5">
          <SkeletonBlock className="h-32" />
        </div>
        <div className="mt-5">
          <SkeletonCardGrid count={4} itemClassName="h-32" className="xl:grid-cols-4" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonBlock className="h-[360px]" />
          <SkeletonBlock className="h-[360px]" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonBlock className="h-[320px]" />
          <SkeletonBlock className="h-[320px]" />
        </div>
        <div className="mt-6">
          <SkeletonTableCard rowCount={5} />
        </div>
      </div>
    </div>
  );
}
