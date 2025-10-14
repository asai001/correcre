import Image from "next/image";

export default function DispCard({
  icon,
  title,
  number,
  unit,
  color,
}: {
  icon: string;
  title: string;
  number: number;
  unit: string;
  color: string;
}) {
  return (
    // <div className="min-w-[200px] sm:min-w-0 sm:w-auto lg:gap-2.5 py-4 lg:py-8 mb-5">
    <div className="flex flex-col bg-white min-w-[200px] sm:min-w-0 sm:w-auto rounded-xl items-center gap-1 lg:gap-2.5 py-4 lg:py-8 mb-5">
      <Image src={icon} alt="" className="w-10 h-10 lg:w-14 lg:h-14" width={60} height={60} />
      <div className="font-bold text-lg lg:text-2xl">{title}</div>
      <div className={`font-bold text-3xl lg:text-4xl`} style={{ color }}>
        {number.toLocaleString("ja-JP")}
      </div>
      <div className="text-gray-600">{unit}</div>
    </div>
  );
}
