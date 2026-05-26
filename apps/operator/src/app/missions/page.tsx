import { MissionManagement } from "@operator/features/mission-management";
import { listOperatorCompaniesFromDynamo } from "@correcre/lib/company-management-server";
import { joinNameParts } from "@correcre/lib/user-profile";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const [currentUser, companies] = await Promise.all([
    requireCurrentOperatorUser(),
    listOperatorCompaniesFromDynamo(),
  ]);

  return (
    <MissionManagement
      initialCompanies={companies}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
