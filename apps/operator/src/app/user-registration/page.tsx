import UserRegistrationManagement from "@operator/features/user-registration";
import { listOperatorCompaniesFromDynamo } from "@operator/features/user-registration/api/server";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

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
  const [session, companies, params] = await Promise.all([
    requireOperatorSession(),
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
      operatorName={getOperatorDisplayName(session)}
    />
  );
}
