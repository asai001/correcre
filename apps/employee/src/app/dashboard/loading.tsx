import { SkeletonBlock, SkeletonTableCard } from "@employee/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="container mx-auto mb-10 px-6">
      <div className="mt-6 flex justify-end">
        <SkeletonBlock className="h-10 w-28 rounded-full" />
      </div>
      <div className="mt-5">
        <SkeletonBlock className="h-56" />
      </div>
      <div className="mt-5">
        <SkeletonBlock className="h-24 rounded-2xl" />
      </div>
      <div className="mt-5">
        <div className="-mx-6 px-6 flex gap-4 overflow-x-auto py-4 md:grid md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonBlock key={index} className="h-36 min-w-[220px] md:min-w-0 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="mt-5">
        <SkeletonBlock className="h-[420px]" />
      </div>
      <div className="mt-10">
        <SkeletonBlock className="h-36" />
      </div>
      <div className="mt-10">
        <SkeletonBlock className="h-[440px]" />
      </div>
      <div className="mt-5">
        <SkeletonTableCard rowCount={5} />
      </div>
    </div>
  );
}
