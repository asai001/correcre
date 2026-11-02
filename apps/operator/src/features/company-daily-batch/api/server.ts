import "server-only";

import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { buildCompanyBillingRow, countCompanyEmployees } from "@correcre/lib/company-billing";
import { calculateCompanyPointReturn, listPendingPointReturnMonths } from "@correcre/lib/company-point-return";
import { toYYYYMMDD } from "@correcre/lib/date/format";
import { getDynamoDocumentClient } from "@correcre/lib/dynamodb/client";
import { listCompanies } from "@correcre/lib/dynamodb/company";
import { listUserMonthlyStatsByCompany } from "@correcre/lib/dynamodb/user-monthly-stats";
import { listUsersByCompany, resyncCompanyEmployeeCounts } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { Company, CompanyPointReturnRecord } from "@correcre/types";

// 導入企業ごとの日次バッチ（日本時間 0 時台に実行）。
// - 利用開始日を迎えたユーザーを請求人数に入れるため、在籍者数を数え直す（変化があった会社だけ書き込む）。
// - 月が明けたら、前月に従業員へ付与されなかったポイントを会社の保有ポイントへ還元する
//   （2026-11 利用分から。2026-10-28 定例で合意）。会社レコードの lastCompanyPointReturnMonth で
//   処理済みの月を管理し、同じ月を二重に還元しない。実行が何日か止まっても、次の実行で取りこぼした月を順に処理する。

type RuntimeConfig = {
  region: string;
  companyTableName: string;
  userTableName: string;
  userMonthlyStatsTableName: string;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    companyTableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
    userMonthlyStatsTableName: readRequiredServerEnv("DDB_USER_MONTHLY_STATS_TABLE_NAME"),
  };
}

export type CompanyDailyBatchResult = {
  companies: number;
  employeeCountsSynced: number;
  pointReturns: Array<{ companyId: string; month: string; returnedPoints: number }>;
  failures: Array<{ companyId: string; error: string }>;
};

async function syncEmployeeCountsIfChanged(config: RuntimeConfig, company: Company, updatedAt: string) {
  const users = await listUsersByCompany({ region: config.region, tableName: config.userTableName }, company.companyId);
  const counts = countCompanyEmployees(users, toYYYYMMDD(new Date(updatedAt)));

  if (
    company.billableEmployees === counts.billableEmployees &&
    company.activeEmployees === counts.activeEmployees &&
    company.totalEmployees === counts.totalEmployees
  ) {
    return false;
  }

  await resyncCompanyEmployeeCounts(
    { region: config.region, tableName: config.userTableName },
    config.companyTableName,
    company.companyId,
    updatedAt,
  );
  return true;
}

async function returnUnawardedPoints(
  config: RuntimeConfig,
  company: Company,
  months: string[],
  currentMonth: string,
  returnedAt: string,
) {
  const stats = await listUserMonthlyStatsByCompany(
    { region: config.region, tableName: config.userMonthlyStatsTableName },
    company.companyId,
  );
  const records: Record<string, CompanyPointReturnRecord> = { ...(company.companyPointReturns ?? {}) };
  let totalReturnedPoints = 0;

  for (const month of months) {
    const billing = buildCompanyBillingRow(company, month, currentMonth);
    const earnedPoints = stats
      .filter((item) => item.yearMonth === month)
      .reduce((sum, item) => sum + (item.earnedPoints ?? 0), 0);
    const result = calculateCompanyPointReturn({ billing, earnedPoints });

    records[month] = {
      month,
      billableEmployees: billing.billable ? billing.billableEmployees : 0,
      ...result,
      returnedAt,
    };
    totalReturnedPoints += result.returnedPoints;
  }

  const lastMonth = months.at(-1)!;
  const client = getDynamoDocumentClient(config.region);

  // 二重還元を防ぐため、処理済みの月が読み込み時点から進んでいないときだけ確定する。
  // 保有ポイントは管理者の付与などでも変わるため、絶対値ではなく ADD で加算する。
  await client.send(
    new UpdateCommand({
      TableName: config.companyTableName,
      Key: { companyId: company.companyId },
      ConditionExpression: company.lastCompanyPointReturnMonth
        ? "lastCompanyPointReturnMonth = :previousReturnMonth"
        : "attribute_not_exists(lastCompanyPointReturnMonth)",
      UpdateExpression:
        "SET lastCompanyPointReturnMonth = :lastMonth, companyPointReturns = :records, updatedAt = :updatedAt ADD companyPointBalance :returnedPoints",
      ExpressionAttributeValues: {
        ...(company.lastCompanyPointReturnMonth
          ? { ":previousReturnMonth": company.lastCompanyPointReturnMonth }
          : {}),
        ":lastMonth": lastMonth,
        ":records": records,
        ":updatedAt": returnedAt,
        ":returnedPoints": totalReturnedPoints,
      },
    }),
  );

  return months.map((month) => ({
    companyId: company.companyId,
    month,
    returnedPoints: records[month].returnedPoints,
  }));
}

export async function runCompanyDailyBatch(now: Date = new Date()): Promise<CompanyDailyBatchResult> {
  const config = getRuntimeConfig();
  const runAt = now.toISOString();
  const currentMonth = toYYYYMMDD(now).slice(0, 7);
  const companies = await listCompanies({ region: config.region, tableName: config.companyTableName });
  const result: CompanyDailyBatchResult = {
    companies: companies.length,
    employeeCountsSynced: 0,
    pointReturns: [],
    failures: [],
  };

  // 1 社の失敗で他社の処理を止めない。
  for (const company of companies) {
    try {
      // 還元は確定済みの過去月の請求行（スナップショット）を使うため、当月分を書き換える人数の再集計より先に行う。
      const months = listPendingPointReturnMonths(company, currentMonth);
      if (months.length) {
        result.pointReturns.push(...(await returnUnawardedPoints(config, company, months, currentMonth, runAt)));
      }

      if (await syncEmployeeCountsIfChanged(config, company, runAt)) {
        result.employeeCountsSynced += 1;
      }
    } catch (error) {
      console.error(`company daily batch failed for ${company.companyId}`, error);
      result.failures.push({
        companyId: company.companyId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

