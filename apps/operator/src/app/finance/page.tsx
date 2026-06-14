import { joinNameParts } from "@correcre/lib/user-profile";

import { FinanceDashboard, getFinanceDashboardData } from "@operator/features/finance-dashboard";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const [currentUser, data] = await Promise.all([
    requireCurrentOperatorUser(),
    getFinanceDashboardData(),
  ]);

  return (
    <FinanceDashboard
      data={data}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
