import CompanyRegistration from "@operator/features/company-registration";
import { listOperatorCompaniesFromDynamo } from "@operator/features/user-registration/api/server";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function CompanyRegistrationPage() {
  const session = await requireOperatorSession();
  const companies = await listOperatorCompaniesFromDynamo();

  return <CompanyRegistration initialCompanies={companies} operatorName={getOperatorDisplayName(session)} />;
}
