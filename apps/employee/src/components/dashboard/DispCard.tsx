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
    <div className="bg-white w-auto lg:w-[32%] h-auto rounded-xl flex flex-col items-center gap-2.5 py-8 mb-5">
      <Image src={icon} alt="" className="w-12 h-12 lg:w-15 lg:h-15" width={60} height={60} />
      <div className="font-bold text-2xl">{title}</div>
      <div className={`text-[${color}] font-bold text-4xl`}>{number.toLocaleString()}</div>
      <div className="text-gray-600">{unit}</div>
    </div>
  );
}
