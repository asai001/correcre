import Philosophy from "@employee/components/dashboard/Philosophy";
import User from "@employee/components/dashboard/User";
import ScoreTile from "@employee/components/dashboard/ScoreTile";
import MissionReport from "@employee/components/dashboard/MissionReport";

export default function DashboardPage() {
  return (
    <div className="container mb-10 mx-auto px-6">
      <div className="pt-5">
        <Philosophy />
      </div>
      <div>
        <User />
      </div>
      {/* md (768px) 以上の場合に ScoreTile をグリッドで3等分で横並びにする */}
      <div className="-mx-6 px-6 flex gap-4 overflow-x-auto overflow-y-visible py-4 md:grid md:grid-cols-3">
        <ScoreTile
          className="min-w-[220px] md:min-w-0"
          icon="/trophy.svg"
          label="今月の達成割合"
          value={70}
          unit="パーセント"
          color="#2563EB"
        />
        <ScoreTile
          className="min-w-[220px] md:min-w-0"
          icon="/coin.svg"
          label="現在の保有ポイント"
          value={2450}
          unit="ポイント"
          color="#D97706"
        />
        <ScoreTile
          className="min-w-[220px] md:min-w-0"
          icon="/calendar.svg"
          label="先月の獲得ポイント"
          value={380}
          unit="ポイント"
          color="#059669"
        />
      </div>
      <div>
        <MissionReport />
      </div>
    </div>
  );
}
