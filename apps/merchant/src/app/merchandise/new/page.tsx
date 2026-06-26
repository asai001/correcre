import { joinNameParts } from "@correcre/lib/user-profile";
import { MerchandiseForm } from "@merchant/features/merchandise";
import { getMerchantCompanyName } from "@merchant/features/merchandise/api/server";
import { requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function MerchandiseNewPage() {
  const user = await requireCurrentMerchantUser();
  const merchantCompanyName = (await getMerchantCompanyName(user.merchantId)) ?? "";

  return (
    <MerchandiseForm
      mode="create"
      merchantName={joinNameParts(user.lastName, user.firstName)}
      merchantDisplayName={merchantCompanyName}
      merchantCompanyName={merchantCompanyName}
    />
  );
}
