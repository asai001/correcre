import { joinNameParts } from "@correcre/lib/user-profile";

import { CompanyInfoForm, getMerchantCompanyInfo } from "@merchant/features/company-info";
import { requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function CompanyInfoPage() {
  const user = await requireCurrentMerchantUser();
  const companyInfo = await getMerchantCompanyInfo(user.merchantId);

  return (
    <CompanyInfoForm
      initialData={companyInfo}
      merchantUserName={companyInfo.contactPersonName || joinNameParts(user.lastName, user.firstName)}
      merchantDisplayName={companyInfo.displayName ?? companyInfo.name}
    />
  );
}
