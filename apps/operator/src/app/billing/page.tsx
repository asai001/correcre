import { joinNameParts } from "@correcre/lib/user-profile";

import { CompanyBillingList, getCompanyBillingListData } from "@operator/features/company-billing";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const [currentUser, data] = await Promise.all([requireCurrentOperatorUser(), getCompanyBillingListData()]);

  return <CompanyBillingList data={data} operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)} />;
}
