import CompanyRegistration from "@operator/features/company-registration";
import { listOperatorCompaniesFromDynamoMock } from "@operator/features/user-registration/api/server.mock";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

export default async function CompanyRegistrationPage() {
  const session = await requireOperatorSession();
  const companies = await listOperatorCompaniesFromDynamoMock();

  return <CompanyRegistration initialCompanies={companies} operatorName={getOperatorDisplayName(session)} />;
}
