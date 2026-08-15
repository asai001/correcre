import { getMerchantSettlementData, SettlementView } from "@merchant/features/settlement";
import {
  getMerchantHeaderInfo,
  getMerchantViewerName,
  requireCurrentMerchantAdminUser,
} from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

// 収支・精算は売上と請求に関わるため、管理者ロール（MERCHANT_ADMIN）のみ閲覧できる。
export default async function SettlementPage() {
  const currentUser = await requireCurrentMerchantAdminUser();
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
