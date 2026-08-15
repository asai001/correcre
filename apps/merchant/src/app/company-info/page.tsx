import { CompanyInfoForm, getMerchantCompanyInfo } from "@merchant/features/company-info";
import { getMerchantViewerName, requireCurrentMerchantAdminUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

// 会社情報は振込先などの機微情報を含むため、管理者ロール（MERCHANT_ADMIN）のみ閲覧・編集できる。
export default async function CompanyInfoPage() {
  const user = await requireCurrentMerchantAdminUser();
  const companyInfo = await getMerchantCompanyInfo(user.merchantId);

  return (
    <CompanyInfoForm
      initialData={companyInfo}
      merchantUserName={getMerchantViewerName(user)}
      merchantDisplayName={companyInfo.displayName ?? companyInfo.name}
    />
  );
}
