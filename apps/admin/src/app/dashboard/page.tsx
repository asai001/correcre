import LoginInfo from "@admin/features/login-info";
import AvgItemCompletion from "@admin/features/avg-item-completion";
import DashboardSummary from "@admin/features/dashboard-summary";
import DashboardMenuTile from "@admin/features/dashboard-menu-tile";
import AvgPointsTrend from "@admin/features/avg-points-trend";
// import RecentReports from "@admin/features/recent-reports";

import { faUserShield } from "@fortawesome/free-solid-svg-icons";

const companyId = "em";
const userId = "u-004";
const targetYearMonth = "2025-11";

export default function DashboardPage() {
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
        <AvgItemCompletion className="min-w-[220px] md:min-w-0" companyId={companyId} />
      </div>
      {/* <div className="mt-5">
        <RecentReports companyId={companyId} />
      </div> */}
    </div>
  );
}
