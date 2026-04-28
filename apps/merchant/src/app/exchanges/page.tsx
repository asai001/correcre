import { ExchangeList } from "@merchant/features/exchanges";
import { listExchangesForMerchant } from "@merchant/features/exchanges/api/server";
import { getMerchantDisplayName } from "@merchant/lib/auth/display-name";
import { requireCurrentMerchantUser, requireMerchantSession } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function ExchangesPage() {
  const [session, user] = await Promise.all([requireMerchantSession(), requireCurrentMerchantUser()]);
  const items = await listExchangesForMerchant(user.merchantId, "ALL");

  return (
    <ExchangeList
      initialItems={items}
      initialFilter="ALL"
      merchantName={getMerchantDisplayName(session)}
    />
  );
}
