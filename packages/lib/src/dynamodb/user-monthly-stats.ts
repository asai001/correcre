import "server-only";

import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import type { UserMonthlyStats } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type UserMonthlyStatsTableConfig = {
  region: string;
  tableName: string;
};

export const USER_MONTHLY_STATS_BY_COMPANY_INDEX = "UserMonthlyStatsByCompanyYearMonth";

export function buildUserMonthlyStatsPk(companyId: string, userId: string) {
  return `COMPANY#${companyId}#USER#${userId}` as const;
}

export function buildUserMonthlyStatsSk(yearMonth: string) {
  return `YM#${yearMonth}` as const;
}

export function buildUserMonthlyStatsByCompanyGsiPk(companyId: string) {
  return `COMPANY#${companyId}` as const;
}

export async function getUserMonthlyStatsByCompanyUserAndYearMonth(
  config: UserMonthlyStatsTableConfig,
  companyId: string,
  userId: string,
  yearMonth: string,
): Promise<UserMonthlyStats | null> {
  const client = getDynamoDocumentClient(config.region);
  const { Item } = await client.send(
    new GetCommand({
      TableName: config.tableName,
      Key: {
        pk: buildUserMonthlyStatsPk(companyId, userId),
        sk: buildUserMonthlyStatsSk(yearMonth),
      },
    }),
  );

  return (Item as UserMonthlyStats | undefined) ?? null;
}

export async function listUserMonthlyStatsByCompanyAndUser(
  config: UserMonthlyStatsTableConfig,
  companyId: string,
  userId: string,
): Promise<UserMonthlyStats[]> {
  const client = getDynamoDocumentClient(config.region);
  const stats: UserMonthlyStats[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": buildUserMonthlyStatsPk(companyId, userId),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      stats.push(...(Items as UserMonthlyStats[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return stats;
}

export async function listUserMonthlyStatsByCompany(
  config: UserMonthlyStatsTableConfig,
  companyId: string,
): Promise<UserMonthlyStats[]> {
  const client = getDynamoDocumentClient(config.region);
  const stats: UserMonthlyStats[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: USER_MONTHLY_STATS_BY_COMPANY_INDEX,
        KeyConditionExpression: "gsi1pk = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": buildUserMonthlyStatsByCompanyGsiPk(companyId),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      stats.push(...(Items as UserMonthlyStats[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return stats;
}
