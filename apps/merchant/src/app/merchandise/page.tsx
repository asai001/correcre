import { MerchandiseList } from "@merchant/features/merchandise";
import { listMerchandiseForMerchant } from "@merchant/features/merchandise/api/server";
import {
  getMerchantHeaderInfo,
  getMerchantViewerName,
  requireCurrentMerchantUser,
} from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function MerchandisePage() {
  const user = await requireCurrentMerchantUser();
  const [items, headerInfo] = await Promise.all([
    listMerchandiseForMerchant(user.merchantId),
    getMerchantHeaderInfo(user.merchantId),
  ]);

  return (
    <MerchandiseList
      initialItems={items}
      merchantName={getMerchantViewerName(user)}
      merchantDisplayName={headerInfo.displayName}
    />
  );
}
