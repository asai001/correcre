import { ExchangeList } from "@operator/features/exchange-management";
import { listExchangesForOperator } from "@operator/features/exchange-management/api/server";
import { listMerchantsForOperator } from "@operator/features/merchant-management/api/server";
import { joinNameParts } from "@correcre/lib/user-profile";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function ExchangesPage() {
  const [currentUser, items, merchants] = await Promise.all([
    requireCurrentOperatorUser(),
    listExchangesForOperator("ALL"),
    listMerchantsForOperator(),
  ]);

  return (
    <ExchangeList
      initialItems={items}
      initialFilter="ALL"
      merchantOptions={merchants.map((merchant) => ({ merchantId: merchant.merchantId, name: merchant.name }))}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
