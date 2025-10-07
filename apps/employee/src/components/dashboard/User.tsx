import Image from "next/image";

export default function User() {
  return (
    <div className="flex justify-between items-center bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 lg:gap-5">
        <Image src="/human.svg" alt="" className="w-10 h-10 lg:w-12 lg:h-12" width={40} height={40} />
        <div className="">
          <div className="font-bold lg:text-lg">田中 太郎 さん</div>
          <div className="lg:text-base text-gray-600">営業部</div>
        </div>
      </div>
      <div className="">
        <div className="lg:text-base text-gray-600">最終ログイン</div>
        <div className="lg:text-sm text-gray-600">2025/10/25 11:00</div>
      </div>
    </div>
  );
}
