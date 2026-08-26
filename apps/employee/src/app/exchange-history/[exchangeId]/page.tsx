import { notFound, redirect } from "next/navigation";

import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { reflectPoints } from "@correcre/lib/points-reflection";

import { ScheduleDetail } from "@employee/features/exchange-schedule";
import {
  ExchangeScheduleNotFoundError,
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

  let view;
  try {
    view = await getScheduleForEmployee(currentUser, exchangeId);
  } catch (error) {
    if (error instanceof ExchangeScheduleNotFoundError) {
      notFound();
    }
    throw error;
  }

  return <ScheduleDetail initial={view} initialPointBalance={reflectPoints(currentUser).spendablePoint} />;
}
