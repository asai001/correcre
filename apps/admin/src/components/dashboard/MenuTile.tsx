import Link from "next/link";

import BaseTile from "@admin/components/dashboard/BaseTile";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";

type MenuTileProps = {
  menuName: string;
  desc: number | string;
  icon: IconDefinition;
  iconColor?: string; // "blue" | "#2563EB" など
  className?: string;
};
export default function MenuTile({ icon, iconColor = "#2563EB", menuName, desc, className }: MenuTileProps) {
  return (
    <Link href={"#"} className="block h-full">
      <BaseTile
        className={`flex flex-col items-start h-full gap-0.5 lg:gap-2 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg ${className}`}
      >
        <div className="flex items-center mb-4">
          <FontAwesomeIcon icon={icon} className="text-xl mr-3" style={{ color: iconColor }} />
          <div className="text-lg lg:text-2xl font-bold">{menuName}</div>
        </div>
        <p className="text-sm opacity-90">{desc}</p>
      </BaseTile>
    </Link>
  );
}
