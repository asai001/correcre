import { SkeletonBlock, SkeletonCardGrid } from "@employee/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div>
      <div className="bg-[#0d2a3d] px-6 py-6">
        <div className="container mx-auto">
          <SkeletonBlock className="h-12 rounded bg-white/10" />
        </div>
      </div>
      <div className="container mx-auto px-6 pb-10">
        <div className="mt-8">
          <SkeletonBlock className="h-8 w-64 rounded" />
        </div>
        <div className="mt-6">
          <SkeletonCardGrid count={6} itemClassName="h-80" className="md:grid-cols-2 xl:grid-cols-3" />
        </div>
      </div>
    </div>
  );
}
