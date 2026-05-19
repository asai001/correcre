import CompanyRegistration from "@operator/features/company-registration";
import { listOperatorCompaniesFromDynamo } from "@correcre/lib/company-management-server";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function CompanyRegistrationPage() {
  const session = await requireOperatorSession();
  const companies = await listOperatorCompaniesFromDynamo();

  return <CompanyRegistration initialCompanies={companies} operatorName={getOperatorDisplayName(session)} />;
}
