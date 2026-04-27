import { MerchantManagement } from "@operator/features/merchant-management";
import { listMerchantsForOperator } from "@operator/features/merchant-management/api/server";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function MerchantsPage() {
  const session = await requireOperatorSession();
  const merchants = await listMerchantsForOperator();

  return <MerchantManagement initialMerchants={merchants} operatorName={getOperatorDisplayName(session)} />;
}
