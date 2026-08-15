import { MerchandiseForm } from "@merchant/features/merchandise";
import {
  getMerchantHeaderInfo,
  getMerchantViewerName,
  requireCurrentMerchantUser,
} from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function MerchandiseNewPage() {
  const user = await requireCurrentMerchantUser();
  const headerInfo = await getMerchantHeaderInfo(user.merchantId);
  const merchantCompanyName = headerInfo.displayName;

  return (
    <MerchandiseForm
      mode="create"
      merchantName={getMerchantViewerName(user)}
      merchantDisplayName={headerInfo.displayName}
      merchantCompanyName={merchantCompanyName}
    />
  );
}
