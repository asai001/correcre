import Philosophy from "@employee/features/philosophy";
import LoginInfo from "@employee/features/login-info";
import DashboardSummary from "@employee/features/dashboard-summary";
import { MissionReport } from "@employee/features/mission-report";
import MonthlyPointsHistory from "@employee/features/monthly-points-history";
import ExchangeHistory from "@employee/features/exchange-history/";

import { toYYYYMM } from "@correcre/lib";

import { faTasks, faChartLine, faReceipt } from "@fortawesome/free-solid-svg-icons";

const companyId = "em";
const userId = "u-001";

export default function DashboardPage() {
  return (
    <div className="container mb-10 mx-auto px-6">
      <div className="mt-5">
        <Philosophy companyId={companyId} />
      </div>
      <div className="mt-5">
        <LoginInfo companyId={companyId} userId={userId} />
      </div>
      <div className="mt-5">
        <DashboardSummary companyId={companyId} userId={userId} targetYearMonth={toYYYYMM(new Date())} />
      </div>
      <div className="mt-5">
        <MissionReport icon={faTasks} companyId={companyId} userId={userId} />
      </div>
      <div className="mt-5">
        <MonthlyPointsHistory icon={faChartLine} companyId={companyId} userId={userId} />
      </div>
      <div className="mt-5">
        <ExchangeHistory icon={faReceipt} iconColor="#48bb78" companyId={companyId} userId={userId} />
      </div>
    </div>
  );
}
