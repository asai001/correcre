import { joinNameParts } from "@correcre/lib/user-profile";
import { MerchandiseList } from "@merchant/features/merchandise";
import { listMerchandiseForMerchant } from "@merchant/features/merchandise/api/server";
import { requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function MerchandisePage() {
  const user = await requireCurrentMerchantUser();
  const items = await listMerchandiseForMerchant(user.merchantId);

  return <MerchandiseList initialItems={items} merchantName={joinNameParts(user.lastName, user.firstName)} />;
}
