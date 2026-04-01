type SkeletonBlockProps = {
  className?: string;
};

type SkeletonCardGridProps = {
  count?: number;
  className?: string;
  itemClassName?: string;
};

type SkeletonTableCardProps = {
  className?: string;
  headerClassName?: string;
  rowCount?: number;
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div aria-hidden className={joinClassNames("animate-pulse rounded-[28px] bg-slate-200/70", className)} />;
}

export function SkeletonCardGrid({
  count = 3,
  className,
  itemClassName = "h-36",
}: SkeletonCardGridProps) {
  return (
    <div className={joinClassNames("grid gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock key={index} className={itemClassName} />
      ))}
    </div>
  );
}

export function SkeletonTableCard({
  className,
  headerClassName = "h-8 w-48",
  rowCount = 5,
}: SkeletonTableCardProps) {
  return (
    <div className={joinClassNames("rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70", className)}>
      <SkeletonBlock className={headerClassName} />
      <div className="mt-6 space-y-3">
        {Array.from({ length: rowCount }, (_, index) => (
          <SkeletonBlock key={index} className="h-14 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
