import LoginInfo from "@admin/features/login-info";
import AvgPointsTrendChart from "@admin/components/dashboard/AvgPointsTrendChart";
import AvgItemCompletionChart from "@admin/components/dashboard/AvgItemCompletionChart";
import DashboardSummary from "@admin/features/dashboard-summary";
import DashboardMenuTile from "@admin/features/dashboard-menu-tile";

import { faChartLine, faTable, faUserShield } from "@fortawesome/free-solid-svg-icons";
import MissionListTable from "@admin/components/dashboard/MissionListTable";

const companyId = "em";
const userId = "u-004";
const targetYearMonth = "2025-11";

/** 先月終端の過去12ヶ月ラベルを生成（SSR側） */
function makeLabels(): string[] {
  const out: string[] = [];
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  end.setMonth(end.getMonth() - 1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function fetchLabel(): string[] {
  return ["挨拶活動", "健康推進活動", "自己研鑽・成長", "効率化・改善提案", "地域活動"];
}

export default function DashboardPage() {
  const avgPointsTrendlabels = makeLabels();
  const avgPointsTrendData = [50, 64, 56, 90, 76, 88, 92, 78, 84, 80, 82, 97]; // 将来的にデータベースからとってくる
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
        <AvgPointsTrendChart
          className="min-w-[220px] md:min-w-0"
          icon={faChartLine}
          labels={avgPointsTrendlabels}
          data={avgPointsTrendData}
        />
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
