import { SkeletonBlock } from "@operator/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-10">
      <SkeletonBlock className="h-24 rounded-[28px]" />
      <SkeletonBlock className="h-20 rounded-[28px]" />
      <SkeletonBlock className="h-56 rounded-[28px]" />
      <SkeletonBlock className="h-96 rounded-[28px]" />
    </div>
  );
}
