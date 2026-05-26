import UserRegistrationManagement from "@operator/features/user-registration";
import { listOperatorCompaniesFromDynamo } from "@correcre/lib/company-management-server";
import { joinNameParts } from "@correcre/lib/user-profile";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

type UserRegistrationPageProps = {
  searchParams: Promise<{
    companyId?: string | string[];
  }>;
};

function pickFirstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UserRegistrationPage({ searchParams }: UserRegistrationPageProps) {
  const [currentUser, companies, params] = await Promise.all([
    requireCurrentOperatorUser(),
    listOperatorCompaniesFromDynamo(),
    searchParams,
  ]);

  const requestedCompanyId = pickFirstQueryValue(params.companyId);
  const selectedCompanyId =
    companies.find((company) => company.companyId === requestedCompanyId)?.companyId ?? companies[0]?.companyId;

  return (
    <UserRegistrationManagement
      companyId={selectedCompanyId}
      companyOptions={companies}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
