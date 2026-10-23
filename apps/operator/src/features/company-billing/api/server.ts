import "server-only";

import { nowYYYYMM } from "@correcre/lib";
import { buildCompanyBillingHistory } from "@correcre/lib/company-billing";
import { listCompanies } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { CompanyBillingListData, CompanyBillingListItem } from "../model/types";

export async function getCompanyBillingListData(): Promise<CompanyBillingListData> {
  const currentMonth = nowYYYYMM();
  const companies = await listCompanies({
    region: readRequiredServerEnv("AWS_REGION"),
    tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
  });

  const items = companies
    .map<CompanyBillingListItem>((company) => ({
      companyId: company.companyId,
      companyName: company.shortName || company.name,
      status: company.status,
      plan: company.plan,
      rows: buildCompanyBillingHistory(company, { currentMonth }),
    }))
    .sort((left, right) => left.companyName.localeCompare(right.companyName, "ja"));

  const months = Array.from(new Set([currentMonth, ...items.flatMap((item) => item.rows.map((row) => row.month))])).sort(
    (left, right) => right.localeCompare(left),
  );

  return { currentMonth, months, companies: items };
}
