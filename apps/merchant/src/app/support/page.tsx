import { SupportInquiryForm } from "@merchant/features/support-inquiry";
import {
  getMerchantHeaderInfo,
  getMerchantViewerName,
  requireCurrentMerchantUser,
} from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const currentUser = await requireCurrentMerchantUser();
  const headerInfo = await getMerchantHeaderInfo(currentUser.merchantId);

  return (
    <SupportInquiryForm
      merchantUserName={getMerchantViewerName(currentUser)}
      merchantDisplayName={headerInfo.displayName || currentUser.merchantId}
    />
  );
}
