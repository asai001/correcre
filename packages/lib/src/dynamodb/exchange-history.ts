import "server-only";

import { QueryCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type {
  ExchangeHistoryActorType,
  ExchangeHistoryItem,
  ExchangeHistoryStatus,
  ExchangeHistoryStatusEvent,
} from "@correcre/types";

import { buildUserSk } from "./user";

import { getDynamoDocumentClient } from "./client";

export type ExchangeHistoryTableConfig = {
  region: string;
  tableName: string;
};

export const EXCHANGE_HISTORY_BY_COMPANY_INDEX = "ExchangeHistoryByCompanyExchangedAt";
export const EXCHANGE_HISTORY_BY_MERCHANT_STATUS_INDEX = "ExchangeHistoryByMerchantStatusExchangedAt";
export const EXCHANGE_HISTORY_BY_MERCHANT_INDEX = "ExchangeHistoryByMerchantExchangedAt";

export function buildExchangeHistoryPk(companyId: string, userId: string) {
  return `COMPANY#${companyId}#USER#${userId}` as const;
}

export function buildExchangeHistorySk(exchangedAt: string, exchangeId: string) {
  return `EXCHANGED_AT#${exchangedAt}#EXCHANGE#${exchangeId}` as const;
}

export function buildExchangeHistoryByCompanyGsiPk(companyId: string) {
  return `COMPANY#${companyId}` as const;
}

export function buildExchangeHistoryByCompanyGsiSk(exchangedAt: string, userId: string, exchangeId: string) {
  return `EXCHANGED_AT#${exchangedAt}#USER#${userId}#EXCHANGE#${exchangeId}` as const;
}

export function buildExchangeHistoryByMerchantStatusGsiPk(merchantId: string, status: ExchangeHistoryStatus) {
  return `MERCHANT#${merchantId}#STATUS#${status}` as const;
}

export function buildExchangeHistoryByMerchantGsiPk(merchantId: string) {
  return `MERCHANT#${merchantId}` as const;
}

export function buildExchangeHistoryByMerchantGsiSk(exchangedAt: string, exchangeId: string) {
  return `EXCHANGED_AT#${exchangedAt}#EXCHANGE#${exchangeId}` as const;
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

export async function listExchangeHistoryByMerchant(
  config: ExchangeHistoryTableConfig,
  merchantId: string,
): Promise<ExchangeHistoryItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const exchanges: ExchangeHistoryItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: EXCHANGE_HISTORY_BY_MERCHANT_INDEX,
        KeyConditionExpression: "gsi3pk = :gsi3pk",
        ExpressionAttributeValues: {
          ":gsi3pk": buildExchangeHistoryByMerchantGsiPk(merchantId),
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

export async function listExchangeHistoryByMerchantAndStatus(
  config: ExchangeHistoryTableConfig,
  merchantId: string,
  status: ExchangeHistoryStatus,
): Promise<ExchangeHistoryItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const exchanges: ExchangeHistoryItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: EXCHANGE_HISTORY_BY_MERCHANT_STATUS_INDEX,
        KeyConditionExpression: "gsi2pk = :gsi2pk",
        ExpressionAttributeValues: {
          ":gsi2pk": buildExchangeHistoryByMerchantStatusGsiPk(merchantId, status),
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

export type PutExchangeHistoryWithReservationInput = {
  exchange: ExchangeHistoryItem;
  user: {
    tableName: string;
    companyId: string;
    userId: string;
    expectedCurrentPointBalance: number;
    nextCurrentPointBalance: number;
    updatedAt: string;
  };
};

export class InsufficientPointBalanceError extends Error {
  constructor(message = "ポイント残高が不足しています") {
    super(message);
    this.name = "InsufficientPointBalanceError";
  }
}

export async function putExchangeHistoryWithReservation(
  config: ExchangeHistoryTableConfig,
  input: PutExchangeHistoryWithReservationInput,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);

  try {
    await client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: input.user.tableName,
              Key: {
                companyId: input.user.companyId,
                sk: buildUserSk(input.user.userId),
              },
              ConditionExpression: "currentPointBalance = :expectedPointBalance",
              UpdateExpression: "SET currentPointBalance = :nextPointBalance, updatedAt = :updatedAt",
              ExpressionAttributeValues: {
                ":expectedPointBalance": input.user.expectedCurrentPointBalance,
                ":nextPointBalance": input.user.nextCurrentPointBalance,
                ":updatedAt": input.user.updatedAt,
              },
            },
          },
          {
            Put: {
              TableName: config.tableName,
              Item: input.exchange,
              ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            },
          },
        ],
      }),
    );
  } catch (error) {
    if (isConditionalCheckFailure(error)) {
      throw new InsufficientPointBalanceError();
    }

    throw error;
  }
}

export async function updateExchangeHistoryStatus(
  config: ExchangeHistoryTableConfig,
  params: {
    item: ExchangeHistoryItem;
    nextStatus: ExchangeHistoryStatus;
    actorType: ExchangeHistoryActorType;
    actorId?: string;
    occurredAt?: string;
    comment?: string;
  },
): Promise<ExchangeHistoryItem> {
  const client = getDynamoDocumentClient(config.region);
  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const event: ExchangeHistoryStatusEvent = {
    status: params.nextStatus,
    occurredAt,
    actorType: params.actorType,
    actorId: params.actorId,
    comment: params.comment,
  };

  const setExpressions: string[] = [
    "#status = :status",
    "#history = list_append(if_not_exists(#history, :emptyList), :event)",
    "updatedAt = :updatedAt",
  ];
  const expressionAttributeNames: Record<string, string> = {
    "#status": "status",
    "#history": "history",
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ":status": params.nextStatus,
    ":event": [event],
    ":emptyList": [],
    ":updatedAt": occurredAt,
  };

  if (params.item.merchantId) {
    setExpressions.push("gsi2pk = :gsi2pk");
    expressionAttributeValues[":gsi2pk"] = buildExchangeHistoryByMerchantStatusGsiPk(
      params.item.merchantId,
      params.nextStatus,
    );
  }

  if (params.nextStatus === "COMPLETED") {
    setExpressions.push("completedAt = :completedAt", "pointHeld = :zero");
    expressionAttributeValues[":completedAt"] = occurredAt;
    expressionAttributeValues[":zero"] = 0;
  } else if (params.nextStatus === "REJECTED" || params.nextStatus === "CANCELED") {
    setExpressions.push("canceledAt = :canceledAt", "pointHeld = :zero");
    expressionAttributeValues[":canceledAt"] = occurredAt;
    expressionAttributeValues[":zero"] = 0;
  }

  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        pk: params.item.pk,
        sk: params.item.sk,
      },
      UpdateExpression: `SET ${setExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );

  const nextHistory = [...(params.item.history ?? []), event];
  const updated: ExchangeHistoryItem = {
    ...params.item,
    status: params.nextStatus,
    history: nextHistory,
    updatedAt: occurredAt,
  };

  if (params.item.merchantId) {
    updated.gsi2pk = buildExchangeHistoryByMerchantStatusGsiPk(params.item.merchantId, params.nextStatus);
  }

  if (params.nextStatus === "COMPLETED") {
    updated.completedAt = occurredAt;
    updated.pointHeld = 0;
  } else if (params.nextStatus === "REJECTED" || params.nextStatus === "CANCELED") {
    updated.canceledAt = occurredAt;
    updated.pointHeld = 0;
  }

  return updated;
}

function isConditionalCheckFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const e = error as { name?: string; CancellationReasons?: Array<{ Code?: string }> };

  if (e.name === "ConditionalCheckFailedException") {
    return true;
  }

  if (e.name === "TransactionCanceledException" && Array.isArray(e.CancellationReasons)) {
    return e.CancellationReasons.some((reason) => reason?.Code === "ConditionalCheckFailed");
  }

  return false;
}
