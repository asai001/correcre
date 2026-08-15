import { getMerchantSettlementData, SettlementView } from "@merchant/features/settlement";
import {
  getMerchantHeaderInfo,
  getMerchantViewerName,
  requireCurrentMerchantUser,
} from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function SettlementPage() {
  const currentUser = await requireCurrentMerchantUser();
  const [data, headerInfo] = await Promise.all([
    getMerchantSettlementData(currentUser.merchantId),
    getMerchantHeaderInfo(currentUser.merchantId),
  ]);

  return (
    <SettlementView
      data={data}
      merchantUserName={getMerchantViewerName(currentUser)}
      merchantDisplayName={headerInfo.displayName}
    />
  );
}
