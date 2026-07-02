import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import PastPerformance from "@employee/features/past-performance";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export default async function PastPerformancePage() {
  const currentUser = await requireCurrentEmployeeUser();
  const company = await getCompanyById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    },
    currentUser.companyId,
  );
  const showPointExchangeLink = company?.showPointExchangeLink === true;
  const companyRegisteredYearMonth = company?.createdAt.slice(0, 7);

  return (
    <PastPerformance
      companyId={currentUser.companyId}
      userId={currentUser.userId}
      companyRegisteredYearMonth={companyRegisteredYearMonth}
      showPointExchangeLink={showPointExchangeLink}
    />
  );
}
