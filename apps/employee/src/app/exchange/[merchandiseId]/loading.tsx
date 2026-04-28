import { SkeletonBlock } from "@employee/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div>
      <div className="bg-[#0d2a3d] px-6 py-6">
        <div className="container mx-auto">
          <SkeletonBlock className="h-12 rounded bg-white/10" />
        </div>
      </div>
      <div className="container mx-auto px-6 pb-10">
        <div className="mt-6">
          <SkeletonBlock className="h-10 w-32 rounded-full" />
        </div>
        <div className="mt-6 space-y-6">
          <SkeletonBlock className="h-[420px] rounded-2xl" />
          <SkeletonBlock className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
