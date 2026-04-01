import { SkeletonBlock } from "@employee/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <SkeletonBlock className="h-40 rounded-[28px]" />
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
            <div className="space-y-6">
              <SkeletonBlock className="h-[420px]" />
              <SkeletonBlock className="h-[520px]" />
              <SkeletonBlock className="h-[380px]" />
            </div>
            <div className="space-y-6">
              <SkeletonBlock className="h-[420px]" />
              <SkeletonBlock className="h-[520px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
