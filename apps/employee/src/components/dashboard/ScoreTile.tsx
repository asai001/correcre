import Image from "next/image";
import BaseTile from "@employee/components/dashboard/BaseTile";

type ScoreTileProps = {
  icon: string;
  label: string;
  value: number | string;
  unit?: string;
  color?: string; // "blue" | "#2563EB" など
  className?: string;
};
export default function ScoreTile({ icon, label, value, unit, color, className }: ScoreTileProps) {
  return (
    <BaseTile className={`flex flex-col items-center gap-0.5 lg:gap-2 ${className}`}>
      <Image src={icon} alt="" className="w-10 h-10 lg:w-14 lg:h-14" width={60} height={60} />
      <div className="font-bold text-lg lg:text-2xl">{label}</div>
      <div className="font-bold text-3xl lg:text-4xl" style={color ? { color } : undefined}>
        {typeof value === "number" ? value.toLocaleString("ja-JP") : value}
      </div>
      {unit && <div className="text-gray-600">{unit}</div>}
    </BaseTile>
  );
}
