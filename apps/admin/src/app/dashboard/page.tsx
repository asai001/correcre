import { logout } from "@admin/app/lib/actions/authenticate";
import AvgItemCompletion from "@admin/features/avg-item-completion";
import AvgPointsTrend from "@admin/features/avg-points-trend";
import DashboardMenuTile from "@admin/features/dashboard-menu-tile";
import DashboardSummary from "@admin/features/dashboard-summary";
import LoginInfo from "@admin/features/login-info";
import RecentReports from "@admin/features/recent-reports";
import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";
import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

export default async function DashboardPage() {
  const currentUser = await requireCurrentAdminUser();
  const companyId = currentUser.companyId;
  const userId = currentUser.userId;
  const targetYearMonth = new Date().toISOString().slice(0, 7);
  const company = await getCompanyById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    },
    companyId,
  );
  const companyName = company?.shortName?.trim() || company?.name?.trim() || companyId;

  return (
    <>
      <div className="mt-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mt-1 break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{companyName}</div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            ログアウト
          </button>
        </form>
      </div>

      <div className="my-5">
        <LoginInfo companyId={companyId} userId={userId} />
      </div>

      <div className="mt-5">
        <DashboardSummary companyId={companyId} userId={userId} targetYearMonth={targetYearMonth} />
      </div>

      <div className="mt-5">
        <DashboardMenuTile />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <AvgPointsTrend companyId={companyId} />
        <AvgItemCompletion className="min-w-[220px] md:min-w-0" companyId={companyId} />
      </div>

      <div className="mt-5">
        <RecentReports companyId={companyId} />
      </div>
    </>
  );
}
