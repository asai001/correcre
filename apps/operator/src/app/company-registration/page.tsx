import CompanyRegistration from "@operator/features/company-registration";
import { listOperatorCompaniesFromDynamo } from "@correcre/lib/company-management-server";
import { joinNameParts } from "@correcre/lib/user-profile";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function CompanyRegistrationPage() {
  const [currentUser, companies] = await Promise.all([
    requireCurrentOperatorUser(),
    listOperatorCompaniesFromDynamo(),
  ]);

  return (
    <CompanyRegistration
      initialCompanies={companies}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
