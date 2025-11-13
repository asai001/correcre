import Philosophy from "@employee/features/philosophy";
import User from "@employee/components/dashboard/User";
import ScoreTile from "@employee/components/dashboard/ScoreTile";
import { MissionReport } from "@employee/features/mission-report";
import MonthlyPointsHistoryChart from "@employee/components/dashboard/MonthlyPointsHistoryChart";
import ExchangeHistoryTable from "@employee/components/dashboard/ExchangeHistoryTable";

import { faChartLine, faReceipt } from "@fortawesome/free-solid-svg-icons";

/** 先月終端の過去24ヶ月ラベルを生成（SSR側） */
function makeLabels(): string[] {
  const out: string[] = [];
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  end.setMonth(end.getMonth() - 1);
  for (let i = 23; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export default function DashboardPage() {
  const monthlyPointsHistoryLabels = makeLabels();
  const monthlyPointsHistoryData = [
    250, 320, 280, 445, 380, 520, 480, 395, 420, 345, 285, 475, 515, 375, 450, 490, 555, 475, 415, 380, 445, 510, 480, 380,
  ]; // 将来的にデータベースからとってくる

  return (
    <div className="container mb-10 mx-auto px-6">
      <div className="mt-5">
        <Philosophy companyId="" missionId="" />
      </div>
      <div className="mt-5">
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
      <div className="mt-5">
        <MissionReport />
      </div>
      <div className="mt-5">
        <MonthlyPointsHistoryChart icon={faChartLine} labels={monthlyPointsHistoryLabels} data={monthlyPointsHistoryData} />
      </div>
      <div className="mt-5">
        <ExchangeHistoryTable icon={faReceipt} iconColor="#48bb78" />
      </div>
    </div>
  );
}
