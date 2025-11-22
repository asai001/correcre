import BaseTile from "@employee/components/dashboard/BaseTile";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

type ScoreTileProps = {
  icon: IconDefinition;
  iconColor?: string;
  label: string;
  value: number | string;
  unit?: string;
  color?: string; // "blue" | "#2563EB" など
  className?: string;
};
export default function ScoreTile({ icon, iconColor, label, value, unit, color, className }: ScoreTileProps) {
  return (
    <BaseTile className={`flex flex-col items-center gap-0.5 lg:gap-2 ${className}`}>
      <div className="flex items-center mb-4">
        <FontAwesomeIcon icon={icon} className="text-xl lg:text-2xl mr-3" style={{ color: iconColor }} />
      </div>
      <div className="font-bold text-lg lg:text-2xl">{label}</div>
      <div className="font-bold text-3xl lg:text-4xl" style={color ? { color } : undefined}>
        {typeof value === "number" ? value.toLocaleString("ja-JP") : value}
      </div>
      {unit && <div className="text-gray-600">{unit}</div>}
    </BaseTile>
  );
}
