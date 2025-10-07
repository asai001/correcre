import Philosophy from "@employee/components/dashboard/Philosophy";
import User from "@employee/components/dashboard/User";
import DispCard from "@employee/components/dashboard/DispCard";

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-6">
      <div className="pt-5">
        <Philosophy />
      </div>
      <div>
        <User />
      </div>
      <div className="flex flex-col justify-between lg:flex-row">
        <DispCard icon="/coin.svg" title="現在の保有ポイント" number={2450} unit="ポイント" color="#D97706" />
        <DispCard icon="/calendar.svg" title="先月の獲得ポイント" number={380} unit="ポイント" color="#059669" />
        <DispCard icon="/trophy.svg" title="今月の達成割合" number={70} unit="パーセント" color="#2563EB" />
      </div>
    </div>
  );
}
