import Philosophy from "@employee/features/philosophy";
import User from "@employee/features/user";
import DashboardSummary from "@employee/features/dashboard-summary";
import { MissionReport } from "@employee/features/mission-report";
import MonthlyPointsHistoryChart from "@employee/components/dashboard/MonthlyPointsHistoryChart";
import ExchangeHistoryTable from "@employee/components/dashboard/ExchangeHistoryTable";

import { toYYYYMM } from "@correcre/lib";

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

const companyId = "em";
const userId = "u-002";

export default function DashboardPage() {
  const monthlyPointsHistoryLabels = makeLabels();
  const monthlyPointsHistoryData = [
    250, 320, 280, 445, 380, 520, 480, 395, 420, 345, 285, 475, 515, 375, 450, 490, 555, 475, 415, 380, 445, 510, 480, 380,
  ]; // 将来的にデータベースからとってくる

  return (
    <div className="container mb-10 mx-auto px-6">
      <div className="mt-5">
        <Philosophy companyId={companyId} />
      </div>
      <div className="mt-5">
        <User companyId={companyId} userId={userId} />
      </div>
      <div className="mt-5">
        <DashboardSummary companyId={companyId} userId={userId} targetYearMonth={toYYYYMM(new Date())} />
      </div>
      <div className="mt-5">
        <MissionReport companyId={companyId} userId={userId} />
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
