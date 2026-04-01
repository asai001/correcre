import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { Philosophy } from "../model/types";

export async function getPhilosophyFromDynamo(companyId: string): Promise<Philosophy | null> {
  const company = await getCompanyById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    },
    companyId,
  );

  if (!company) {
    return null;
  }

  return {
    corporatePhilosophy: company.philosophy?.corporatePhilosophy,
    purpose: company.philosophy?.purpose,
  };
}
