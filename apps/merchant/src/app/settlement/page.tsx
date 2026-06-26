import { joinNameParts } from "@correcre/lib/user-profile";

import { getMerchantSettlementData, SettlementView } from "@merchant/features/settlement";
import { getMerchantDisplayName, requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function SettlementPage() {
  const currentUser = await requireCurrentMerchantUser();
  const [data, merchantDisplayName] = await Promise.all([
    getMerchantSettlementData(currentUser.merchantId),
    getMerchantDisplayName(currentUser.merchantId),
  ]);

  return (
    <SettlementView
      data={data}
      merchantUserName={joinNameParts(currentUser.lastName, currentUser.firstName)}
      merchantDisplayName={merchantDisplayName}
    />
  );
}
