import { redirect } from "next/navigation";

import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";

import { ExchangeList } from "@employee/features/exchange";
import { listPublishedMerchandiseForEmployee } from "@employee/features/exchange/api/server";
import { listExchangeFavoritesForEmployee } from "@employee/features/exchange-favorite/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function ExchangePage() {
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

  const [items, favoritesResult] = await Promise.all([
    listPublishedMerchandiseForEmployee(),
    listExchangeFavoritesForEmployee({
      companyId: currentUser.companyId,
      userId: currentUser.userId,
    }),
  ]);

  return (
    <ExchangeList
      items={items}
      currentPointBalance={currentUser.currentPointBalance ?? 0}
      userName={joinNameParts(currentUser.lastName, currentUser.firstName)}
      initialFavorites={favoritesResult.favorites}
    />
  );
}
