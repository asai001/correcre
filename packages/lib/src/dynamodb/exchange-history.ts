import "server-only";

import { QueryCommand } from "@aws-sdk/lib-dynamodb";

import type { ExchangeHistoryItem } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type ExchangeHistoryTableConfig = {
  region: string;
  tableName: string;
};

export const EXCHANGE_HISTORY_BY_COMPANY_INDEX = "ExchangeHistoryByCompanyExchangedAt";

export function buildExchangeHistoryPk(companyId: string, userId: string) {
  return `COMPANY#${companyId}#USER#${userId}` as const;
}

export function buildExchangeHistoryByCompanyGsiPk(companyId: string) {
  return `COMPANY#${companyId}` as const;
}

export async function listExchangeHistoryByCompanyAndUser(
  config: ExchangeHistoryTableConfig,
  companyId: string,
  userId: string,
): Promise<ExchangeHistoryItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const exchanges: ExchangeHistoryItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": buildExchangeHistoryPk(companyId, userId),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      exchanges.push(...(Items as ExchangeHistoryItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return exchanges;
}

export async function listExchangeHistoryByCompany(
  config: ExchangeHistoryTableConfig,
  companyId: string,
): Promise<ExchangeHistoryItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const exchanges: ExchangeHistoryItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: EXCHANGE_HISTORY_BY_COMPANY_INDEX,
        KeyConditionExpression: "gsi1pk = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": buildExchangeHistoryByCompanyGsiPk(companyId),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      exchanges.push(...(Items as ExchangeHistoryItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return exchanges;
}
