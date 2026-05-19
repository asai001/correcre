import { MissionManagement } from "@operator/features/mission-management";
import { listOperatorCompaniesFromDynamo } from "@correcre/lib/company-management-server";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const session = await requireOperatorSession();
  const companies = await listOperatorCompaniesFromDynamo();

  return <MissionManagement initialCompanies={companies} operatorName={getOperatorDisplayName(session)} />;
}
