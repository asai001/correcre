import Philosophy from "@employee/components/dashboard/Philosophy";
import User from "@employee/components/dashboard/User";
import DispCard from "@employee/components/dashboard/DispCard";
import ScoreTile from "@employee/components/dashboard/ScoreTile";

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-6">
      <div className="pt-5">
        <Philosophy />
      </div>
      <div>
        <User />
      </div>
      <div className="flex gap-4 overflow-x-auto sm:grid sm:grid-cols-3">
        <ScoreTile className="min-w-[250px]" icon="/trophy.svg" label="今月の達成割合" value={70} unit="パーセント" color="#2563EB" />
        <ScoreTile className="min-w-[250px]" icon="/coin.svg" label="現在の保有ポイント" value={2450} unit="ポイント" color="#D97706" />
        <ScoreTile className="min-w-[250px]" icon="/calendar.svg" label="先月の獲得ポイント" value={380} unit="ポイント" color="#059669" />
      </div>
    </div>
  );
}
