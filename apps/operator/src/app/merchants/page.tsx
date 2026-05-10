import { MerchantManagement } from "@operator/features/merchant-management";
import {
  listMerchantsForOperator,
  listPendingMerchantApplicationsForOperator,
} from "@operator/features/merchant-management/api/server";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function MerchantsPage() {
  const session = await requireOperatorSession();
  const [merchants, pendingApplications] = await Promise.all([
    listMerchantsForOperator(),
    listPendingMerchantApplicationsForOperator(),
  ]);

  return (
    <MerchantManagement
      initialMerchants={merchants}
      initialPendingApplications={pendingApplications}
      operatorName={getOperatorDisplayName(session)}
    />
  );
}
