import { joinNameParts } from "@correcre/lib/user-profile";
import { ExchangeList } from "@merchant/features/exchanges";
import { listExchangesForMerchant } from "@merchant/features/exchanges/api/server";
import { requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function ExchangesPage() {
  const user = await requireCurrentMerchantUser();
  const items = await listExchangesForMerchant(user.merchantId, "ALL");

  return (
    <ExchangeList
      initialItems={items}
      initialFilter="ALL"
      merchantName={joinNameParts(user.lastName, user.firstName)}
    />
  );
}
