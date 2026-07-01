import { joinNameParts } from "@correcre/lib/user-profile";
import { ExchangeList } from "@merchant/features/exchanges";
import { listExchangesForMerchant } from "@merchant/features/exchanges/api/server";
import { getMerchantHeaderInfo, requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function ExchangesPage() {
  const user = await requireCurrentMerchantUser();
  const [items, headerInfo] = await Promise.all([
    listExchangesForMerchant(user.merchantId, "ALL"),
    getMerchantHeaderInfo(user.merchantId),
  ]);

  return (
    <ExchangeList
      initialItems={items}
      initialFilter="ALL"
      merchantName={headerInfo.contactPersonName || joinNameParts(user.lastName, user.firstName)}
      merchantDisplayName={headerInfo.displayName}
    />
  );
}
