import { MerchandiseList } from "@merchant/features/merchandise";
import { listMerchandiseForMerchant } from "@merchant/features/merchandise/api/server";
import { getMerchantDisplayName } from "@merchant/lib/auth/display-name";
import { requireCurrentMerchantUser, requireMerchantSession } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function MerchandisePage() {
  const [session, user] = await Promise.all([requireMerchantSession(), requireCurrentMerchantUser()]);
  const items = await listMerchandiseForMerchant(user.merchantId);

  return <MerchandiseList initialItems={items} merchantName={getMerchantDisplayName(session)} />;
}
