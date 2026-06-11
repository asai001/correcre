import { MerchantManagement } from "@operator/features/merchant-management";
import { listMerchantStatsForOperator } from "@operator/features/merchant-management/api/merchandise-server";
import {
  listMerchantsForOperator,
  listPendingMerchantApplicationsForOperator,
} from "@operator/features/merchant-management/api/server";
import { joinNameParts } from "@correcre/lib/user-profile";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function MerchantsPage() {
  const [currentUser, merchants, pendingApplications, merchantStats] = await Promise.all([
    requireCurrentOperatorUser(),
    listMerchantsForOperator(),
    listPendingMerchantApplicationsForOperator(),
    listMerchantStatsForOperator(),
  ]);

  return (
    <MerchantManagement
      initialMerchants={merchants}
      initialPendingApplications={pendingApplications}
      merchantStats={merchantStats}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
