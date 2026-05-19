import "server-only";

import { PutCommand } from "@aws-sdk/lib-dynamodb";

import type { OperatorAuditLogItem } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type OperatorAuditLogTableConfig = {
  region: string;
  tableName: string;
};

export function buildOperatorAuditLogPk(operatorUserId: string) {
  return `OPERATOR#${operatorUserId}` as const;
}

export function buildOperatorAuditLogSk(occurredAt: string, eventId: string) {
  return `OCCURRED_AT#${occurredAt}#EVENT#${eventId}` as const;
}

export function buildOperatorAuditLogByMerchantGsiPk(merchantId: string) {
  return `MERCHANT#${merchantId}` as const;
}

export async function putOperatorAuditLog(
  config: OperatorAuditLogTableConfig,
  item: OperatorAuditLogItem,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
    }),
  );
}
