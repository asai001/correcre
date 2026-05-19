import { MerchandiseForm } from "@merchant/features/merchandise";
import { getMerchantCompanyName } from "@merchant/features/merchandise/api/server";
import { getMerchantDisplayName } from "@merchant/lib/auth/display-name";
import { requireCurrentMerchantUser, requireMerchantSession } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function MerchandiseNewPage() {
  const [session, user] = await Promise.all([requireMerchantSession(), requireCurrentMerchantUser()]);
  const merchantCompanyName = (await getMerchantCompanyName(user.merchantId)) ?? "";

  return (
    <MerchandiseForm
      mode="create"
      merchantName={getMerchantDisplayName(session)}
      merchantCompanyName={merchantCompanyName}
    />
  );
}
