import { toYYYYMM } from "@correcre/lib";
import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import DashboardLinks from "@employee/features/dashboard-links";
import DashboardSummary from "@employee/features/dashboard-summary";
import ExchangeHistory from "@employee/features/exchange-history/";
import { ReservationBanner, ScheduleBanner } from "@employee/features/exchange-schedule";
import {
  listPendingReservationsForEmployee,
  listPendingSchedulesForEmployee,
} from "@employee/features/exchange-schedule/api/server";
import type {
  PendingReservationSummary,
  PendingScheduleSummary,
} from "@employee/features/exchange-schedule/model/types";
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
  const company = await getCompanyById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    },
    companyId,
  );
  const companyName = company?.shortName?.trim() || company?.name?.trim() || companyId;
  const showPointExchangeLink = company?.showPointExchangeLink === true;

  // 日程調整中・予約待ちの交換の通知バナー。取得に失敗してもダッシュボード自体は表示する。
  let pendingSchedules: PendingScheduleSummary[] = [];
  let pendingReservations: PendingReservationSummary[] = [];
  if (showPointExchangeLink) {
    try {
      pendingSchedules = await listPendingSchedulesForEmployee(currentUser);
    } catch (error) {
      console.error("Failed to load pending delivery schedules.", error);
    }
    try {
      pendingReservations = await listPendingReservationsForEmployee(currentUser);
    } catch (error) {
      console.error("Failed to load pending reservations.", error);
    }
  }

  return (
    <div className="container mx-auto mb-10 px-6">
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
      <div className="mt-5">
        <Philosophy companyId={companyId} />
      </div>
      {pendingSchedules.length > 0 ? (
        <div className="mt-5">
          <ScheduleBanner items={pendingSchedules} />
        </div>
      ) : null}
      {pendingReservations.length > 0 ? (
        <div className="mt-5">
          <ReservationBanner items={pendingReservations} />
        </div>
      ) : null}
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
        <DashboardLinks
          initialProfile={{
            lastName: currentUser.lastName,
            firstName: currentUser.firstName,
            lastNameKana: currentUser.lastNameKana ?? "",
            firstNameKana: currentUser.firstNameKana ?? "",
            email: currentUser.email,
            phoneNumber: currentUser.phoneNumber,
            address: currentUser.address,
          }}
          showPointExchangeLink={showPointExchangeLink}
        />
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
