import { redirect } from "next/navigation";

import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";

import { ExchangeHistoryPage } from "@employee/features/exchange-history";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function ExchangeHistoryRoute() {
  const currentUser = await requireCurrentEmployeeUser();

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

  return (
    <ExchangeHistoryPage
      companyId={currentUser.companyId}
      userId={currentUser.userId}
      userName={joinNameParts(currentUser.lastName, currentUser.firstName)}
      currentPointBalance={currentUser.currentPointBalance ?? 0}
    />
  );
}
