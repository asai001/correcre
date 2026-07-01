import { joinNameParts } from "@correcre/lib/user-profile";
import { MerchandiseList } from "@merchant/features/merchandise";
import { listMerchandiseForMerchant } from "@merchant/features/merchandise/api/server";
import { getMerchantHeaderInfo, requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

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
      merchantName={headerInfo.contactPersonName || joinNameParts(user.lastName, user.firstName)}
      merchantDisplayName={headerInfo.displayName}
    />
  );
}
