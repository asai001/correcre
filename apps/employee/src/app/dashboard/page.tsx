import { toYYYYMM } from "@correcre/lib";
import DashboardLinks from "@employee/features/dashboard-links";
import DashboardSummary from "@employee/features/dashboard-summary";
import ExchangeHistory from "@employee/features/exchange-history/";
import LoginInfo from "@employee/features/login-info";
import { MissionReport } from "@employee/features/mission-report";
import MonthlyPointsHistory from "@employee/features/monthly-points-history";
import Philosophy from "@employee/features/philosophy";
import { logout } from "@employee/app/lib/actions/authenticate";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

import { faChartLine, faReceipt, faTasks } from "@fortawesome/free-solid-svg-icons";

export default async function DashboardPage() {
  const currentUser = await requireCurrentEmployeeUser();
  const { companyId, userId } = currentUser;

  return (
    <div className="container mx-auto mb-10 px-6">
      <div className="mt-6 flex justify-end">
        <form action={logout}>
          <button
            type="submit"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            ログアウト
          </button>
        </form>
      </div>
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
      <div className="mt-10">
        <DashboardLinks />
      </div>
      <div className="mt-10">
        <MonthlyPointsHistory icon={faChartLine} companyId={companyId} userId={userId} />
      </div>
      <div className="mt-5">
        <ExchangeHistory icon={faReceipt} iconColor="#48bb78" companyId={companyId} userId={userId} />
      </div>
    </div>
  );
}
