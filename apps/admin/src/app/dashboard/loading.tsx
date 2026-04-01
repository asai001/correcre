import { SkeletonBlock, SkeletonTableCard } from "@admin/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="space-y-5 pb-5">
      <div className="mt-6 flex justify-end">
        <SkeletonBlock className="h-10 w-28 rounded-full" />
      </div>
      <SkeletonBlock className="h-24 rounded-2xl" />
      <div className="-mx-6 px-6 flex gap-4 overflow-x-auto py-4 md:grid md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonBlock key={index} className="h-36 min-w-[220px] md:min-w-0 rounded-2xl" />
        ))}
      </div>
      <SkeletonBlock className="h-44 rounded-[28px]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonBlock className="h-[440px]" />
        <SkeletonBlock className="h-[440px]" />
      </div>
      <SkeletonTableCard rowCount={5} />
    </div>
  );
}
