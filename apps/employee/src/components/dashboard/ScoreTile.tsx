import BaseTile from "@employee/components/dashboard/BaseTile";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

type ScoreTileProps = {
  icon: IconDefinition;
  iconColor?: string;
  iconBgColor?: string;
  label: string;
  value: number | string;
  unit?: string;
  color?: string; // "blue" | "#2563EB" など
  className?: string;
};
export default function ScoreTile({ icon, iconColor, iconBgColor, label, value, unit, color, className }: ScoreTileProps) {
  return (
    <BaseTile className={`flex flex-col items-center gap-0.5 lg:gap-2 ${className}`}>
      <div
        className="w-18 h-18 mb-4 rounded-full flex items-center justify-center"
        style={iconBgColor ? { backgroundColor: iconBgColor } : undefined}
      >
        <FontAwesomeIcon icon={icon} className="text-2xl lg:text-3xl" style={{ color: iconColor }} />
      </div>
      <div className="font-bold text-lg lg:text-2xl">{label}</div>
      <div className="font-bold text-3xl lg:text-4xl" style={color ? { color } : undefined}>
        {typeof value === "number" ? value.toLocaleString("ja-JP") : value}
      </div>
      {unit && <div className="text-gray-600">{unit}</div>}
    </BaseTile>
  );
}
