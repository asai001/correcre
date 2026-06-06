import type { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";

import type {
  PointTransaction,
  PointTransactionActorType,
  PointTransactionSourceType,
  PointTransactionType,
} from "@correcre/types";

export type PointTransactionTableConfig = {
  region: string;
  tableName: string;
};

export type CreatePointTransactionInput = {
  companyId: string;
  userId: string;
  transactionId: string;
  occurredAt: string;
  type: PointTransactionType;
  deltaPoint: number;
  balanceAfter?: number;
  sourceType: PointTransactionSourceType;
  sourceId: string;
  actorType: PointTransactionActorType;
  actorUserId?: string;
  description?: string;
};

export function buildPointTransactionPk(companyId: string, userId: string) {
  return `COMPANY#${companyId}#USER#${userId}` as const;
}

export function buildPointTransactionSk(occurredAt: string, transactionId: string) {
  return `OCCURRED_AT#${occurredAt}#TX#${transactionId}` as const;
}

export function buildPointTransactionByCompanyGsiPk(companyId: string) {
  return `COMPANY#${companyId}` as const;
}

export function buildPointTransactionByCompanyGsiSk(occurredAt: string, userId: string, transactionId: string) {
  return `OCCURRED_AT#${occurredAt}#USER#${userId}#TX#${transactionId}` as const;
}

export function createPointTransaction(input: CreatePointTransactionInput): PointTransaction {
  return {
    pk: buildPointTransactionPk(input.companyId, input.userId),
    sk: buildPointTransactionSk(input.occurredAt, input.transactionId),
    companyId: input.companyId,
    userId: input.userId,
    transactionId: input.transactionId,
    occurredAt: input.occurredAt,
    yearMonth: input.occurredAt.slice(0, 7),
    type: input.type,
    deltaPoint: input.deltaPoint,
    balanceAfter: input.balanceAfter,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    actorType: input.actorType,
    actorUserId: input.actorUserId,
    description: input.description,
    createdAt: input.occurredAt,
    gsi1pk: buildPointTransactionByCompanyGsiPk(input.companyId),
    gsi1sk: buildPointTransactionByCompanyGsiSk(input.occurredAt, input.userId, input.transactionId),
  };
}

export function createPointTransactionPutTransactItem(
  tableName: string,
  transaction: PointTransaction,
): NonNullable<TransactWriteCommandInput["TransactItems"]>[number] {
  return {
    Put: {
      TableName: tableName,
      Item: transaction,
      ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
    },
  };
}
