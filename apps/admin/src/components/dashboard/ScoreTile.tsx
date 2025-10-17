import BaseTile from "@admin/components/dashboard/BaseTile";

type ScoreTileProps = {
  label: string;
  value: number | string;
  unit?: string;
  color?: string; // "blue" | "#2563EB" など
  className?: string;
};
export default function ScoreTile({ label, value, unit, color, className }: ScoreTileProps) {
  return (
    <BaseTile className={`flex flex-col items-center gap-0.5 lg:gap-2 ${className}`}>
      <div className="font-bold text-lg lg:text-2xl">{label}</div>
      <div className="font-bold text-3xl lg:text-4xl" style={color ? { color } : undefined}>
        {typeof value === "number" ? value.toLocaleString("ja-JP") : value}
      </div>
      {unit && <div className="text-gray-600">{unit}</div>}
    </BaseTile>
  );
}
