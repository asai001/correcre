import { joinNameParts } from "@correcre/lib/user-profile";

import { SupportInquiryForm } from "@merchant/features/support-inquiry";
import { getMerchantHeaderInfo, requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const currentUser = await requireCurrentMerchantUser();
  const headerInfo = await getMerchantHeaderInfo(currentUser.merchantId);

  return (
    <SupportInquiryForm
      merchantUserName={headerInfo.contactPersonName || joinNameParts(currentUser.lastName, currentUser.firstName) || currentUser.email}
      merchantDisplayName={headerInfo.displayName || currentUser.merchantId}
    />
  );
}
