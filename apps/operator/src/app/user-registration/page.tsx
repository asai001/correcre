import UserRegistrationManagement from "@operator/features/user-registration";
import { listOperatorCompaniesFromDynamoMock } from "@operator/features/user-registration/api/server.mock";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

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
    listOperatorCompaniesFromDynamoMock(),
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
