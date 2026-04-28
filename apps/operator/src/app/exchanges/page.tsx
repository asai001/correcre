import { ExchangeList } from "@operator/features/exchange-management";
import { listExchangesForOperator } from "@operator/features/exchange-management/api/server";
import { listMerchantsForOperator } from "@operator/features/merchant-management/api/server";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function ExchangesPage() {
  const session = await requireOperatorSession();
  const [items, merchants] = await Promise.all([
    listExchangesForOperator("ALL"),
    listMerchantsForOperator(),
  ]);

  return (
    <ExchangeList
      initialItems={items}
      initialFilter="ALL"
      merchantOptions={merchants.map((merchant) => ({ merchantId: merchant.merchantId, name: merchant.name }))}
      operatorName={getOperatorDisplayName(session)}
    />
  );
}
