import { joinNameParts } from "@correcre/lib/user-profile";
import { MerchandiseList } from "@merchant/features/merchandise";
import { listMerchandiseForMerchant } from "@merchant/features/merchandise/api/server";
import { getMerchantDisplayName, requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function MerchandisePage() {
  const user = await requireCurrentMerchantUser();
  const [items, merchantDisplayName] = await Promise.all([
    listMerchandiseForMerchant(user.merchantId),
    getMerchantDisplayName(user.merchantId),
  ]);

  return (
    <MerchandiseList
      initialItems={items}
      merchantName={joinNameParts(user.lastName, user.firstName)}
      merchantDisplayName={merchantDisplayName}
    />
  );
}
