import "server-only";

import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

import type { Company } from "@correcre/types";

import { toYYYYMM } from "../date/format";
import { getDynamoDocumentClient } from "./client";

export type CompanyTableConfig = {
  region: string;
  tableName: string;
};

// 請求の対象月は日本時間で区切る（サーバーの TZ が UTC でも月初 0〜9 時が前月に入らないようにする）。
export function toBillingSnapshotMonth(value: string | Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return toYYYYMM(date);
}

export function buildCompanyMonthlyBillingSnapshot(params: {
  month: string;
  status: Company["status"];
  activeEmployees: number;
  monthlyBaseFee?: number;
  perEmployeeMonthlyFee: number;
  capturedAt: string;
}) {
  const activeEmployees = Math.max(0, Math.trunc(params.activeEmployees));
  const monthlyBaseFee = Math.max(0, Math.trunc(params.monthlyBaseFee ?? 0));
  const perEmployeeMonthlyFee = Math.max(0, Math.trunc(params.perEmployeeMonthlyFee));
  const monthlyIncomeYen =
    params.status === "INACTIVE" ? 0 : monthlyBaseFee + activeEmployees * perEmployeeMonthlyFee;

  return {
    month: params.month,
    status: params.status,
    activeEmployees,
    monthlyBaseFee,
    perEmployeeMonthlyFee,
    monthlyIncomeYen,
    capturedAt: params.capturedAt,
  };
}

export function upsertCompanyMonthlyBillingSnapshot(
  company: Company,
  snapshot: ReturnType<typeof buildCompanyMonthlyBillingSnapshot>,
) {
  return {
    ...(company.monthlyBillingSnapshots ?? {}),
    [snapshot.month]: snapshot,
  };
}

export async function getCompanyById(config: CompanyTableConfig, companyId: string): Promise<Company | null> {
  const client = getDynamoDocumentClient(config.region);
  const { Item } = await client.send(
    new GetCommand({
      TableName: config.tableName,
      Key: {
        companyId,
      },
    }),
  );

  return (Item as Company | undefined) ?? null;
}

export async function listCompanies(config: CompanyTableConfig): Promise<Company[]> {
  const client = getDynamoDocumentClient(config.region);
  const companies: Company[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new ScanCommand({
        TableName: config.tableName,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      companies.push(...(Items as Company[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return companies;
}

export type PutCompanyOptions = {
  conditionExpression?: string;
  expressionAttributeValues?: Record<string, unknown>;
};

export async function putCompany(
  config: CompanyTableConfig,
  company: Company,
  options?: PutCompanyOptions,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: company,
      ConditionExpression: options?.conditionExpression,
      ExpressionAttributeValues: options?.expressionAttributeValues,
    }),
  );
}
