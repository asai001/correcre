import { notFound, redirect } from "next/navigation";

import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { reflectPoints } from "@correcre/lib/points-reflection";

import { ReservationDetail, ScheduleDetail } from "@employee/features/exchange-schedule";
import {
  ExchangeScheduleNotFoundError,
  getReservationForEmployee,
  getScheduleForEmployee,
} from "@employee/features/exchange-schedule/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ exchangeId: string }>;
};

export default async function ExchangeSchedulePage({ params }: PageProps) {
  const [currentUser, { exchangeId }] = await Promise.all([requireCurrentEmployeeUser(), params]);

  const company = await getCompanyById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    },
    currentUser.companyId,
  );

  if (company?.showPointExchangeLink !== true) {
    redirect("/dashboard");
  }

  const pointBalance = reflectPoints(currentUser).spendablePoint;

  let view;
  try {
    view = await getScheduleForEmployee(currentUser, exchangeId);
  } catch (error) {
    if (error instanceof ExchangeScheduleNotFoundError) {
      // 日程調整のない交換でも、予約が必要な商品（サロン等）は予約案内を表示する。
      const reservation = await getReservationForEmployee(currentUser, exchangeId).catch(() => null);
      if (reservation) {
        return <ReservationDetail view={reservation} initialPointBalance={pointBalance} />;
      }
      notFound();
    }
    throw error;
  }

  return <ScheduleDetail initial={view} initialPointBalance={pointBalance} />;
}
