import { joinNameParts } from "@correcre/lib/user-profile";

import { getMerchantOverallSummaryForOperator } from "@operator/features/merchant-management/api/merchandise-server";
import { MerchantOverallSummaryView } from "@operator/features/merchant-management";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function MerchantSummaryPage() {
  const [currentUser, summary] = await Promise.all([
    requireCurrentOperatorUser(),
    getMerchantOverallSummaryForOperator(),
  ]);

  return (
    <MerchantOverallSummaryView
      summary={summary}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
