import { SkeletonBlock } from "@employee/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-2xl px-6 pt-8">
      <SkeletonBlock className="h-[480px] rounded-2xl" />
    </div>
  );
}
