import LoginInfo from "@admin/features/login-info";
import AvgItemCompletionChart from "@admin/components/dashboard/AvgItemCompletionChart";
import DashboardSummary from "@admin/features/dashboard-summary";
import DashboardMenuTile from "@admin/features/dashboard-menu-tile";
import AvgPointsTrend from "@admin/features/avg-points-trend";

import { faChartLine, faTable, faUserShield } from "@fortawesome/free-solid-svg-icons";
import MissionListTable from "@admin/components/dashboard/MissionListTable";

const companyId = "em";
const userId = "u-004";
const targetYearMonth = "2025-11";

function fetchLabel(): string[] {
  return ["挨拶活動", "健康推進活動", "自己研鑽・成長", "効率化・改善提案", "地域活動"];
}

export default function DashboardPage() {
  const avgItemCompletionlabels = fetchLabel();
  const avgItemCompletionData = [70, 80, 85, 80, 70]; // 将来的にデータベースからとってくる
  return (
    <div className="container mb-10 mx-auto px-6">
      <div className="my-5">
        <LoginInfo icon={faUserShield} iconColor={"#fff"} companyId={companyId} userId={userId} />
      </div>
      <div className="mt-5">
        <DashboardSummary companyId={companyId} userId={userId} targetYearMonth={targetYearMonth} />
      </div>
      {/* md (768px) 以上の場合に ScoreTile をグリッドで3等分で横並びにする */}
      <div className="mt-5">
        <DashboardMenuTile />
      </div>
      <div className="grid lg:grid-cols-2 mt-5 gap-4">
        <AvgPointsTrend companyId={companyId} />
        <AvgItemCompletionChart
          className="min-w-[220px] md:min-w-0"
          icon={faChartLine}
          labels={avgItemCompletionlabels}
          data={avgItemCompletionData}
        />
      </div>
      <div className="mt-5">
        <MissionListTable icon={faTable} />
      </div>
    </div>
  );
}
