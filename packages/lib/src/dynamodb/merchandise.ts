import "server-only";

import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type {
  Merchandise,
  MerchandiseAuditActor,
  MerchandiseHistoryEvent,
  MerchandiseStatus,
} from "@correcre/types";
import { MERCHANDISE_HISTORY_MAX_ENTRIES } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type MerchandiseTableConfig = {
  region: string;
  tableName: string;
};

export const MERCHANDISE_BY_STATUS_INDEX = "MerchandiseByStatus";

export function buildMerchandiseSk(merchandiseId: string) {
  return `MERCHANDISE#${merchandiseId}` as const;
}

export function buildMerchandiseByStatusGsiPk(status: MerchandiseStatus) {
  return `STATUS#${status}` as const;
}

export function buildMerchandiseByStatusGsiSk(merchantId: string, merchandiseId: string) {
  return `MERCHANT#${merchantId}#MERCHANDISE#${merchandiseId}` as const;
}

export async function getMerchandise(
  config: MerchandiseTableConfig,
  merchantId: string,
  merchandiseId: string,
): Promise<Merchandise | null> {
  const client = getDynamoDocumentClient(config.region);
  const { Item } = await client.send(
    new GetCommand({
      TableName: config.tableName,
      Key: {
        merchantId,
        sk: buildMerchandiseSk(merchandiseId),
      },
    }),
  );

  return (Item as Merchandise | undefined) ?? null;
}

export async function listMerchandiseByMerchant(
  config: MerchandiseTableConfig,
  merchantId: string,
): Promise<Merchandise[]> {
  const client = getDynamoDocumentClient(config.region);
  const items: Merchandise[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "merchantId = :merchantId",
        ExpressionAttributeValues: {
          ":merchantId": merchantId,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      items.push(...(Items as Merchandise[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

export async function listMerchandiseByStatus(
  config: MerchandiseTableConfig,
  status: MerchandiseStatus,
): Promise<Merchandise[]> {
  const client = getDynamoDocumentClient(config.region);
  const items: Merchandise[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: MERCHANDISE_BY_STATUS_INDEX,
        KeyConditionExpression: "gsi1pk = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": buildMerchandiseByStatusGsiPk(status),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      items.push(...(Items as Merchandise[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

export type PutMerchandiseOptions = {
  conditionExpression?: string;
};

export async function putMerchandise(
  config: MerchandiseTableConfig,
  item: Merchandise,
  options?: PutMerchandiseOptions,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
      ConditionExpression: options?.conditionExpression,
    }),
  );
}

export async function deleteMerchandise(
  config: MerchandiseTableConfig,
  merchantId: string,
  merchandiseId: string,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new DeleteCommand({
      TableName: config.tableName,
      Key: {
        merchantId,
        sk: buildMerchandiseSk(merchandiseId),
      },
    }),
  );
}

export async function adjustMerchandiseFavoriteCount(
  config: MerchandiseTableConfig,
  merchantId: string,
  merchandiseId: string,
  delta: number,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        merchantId,
        sk: buildMerchandiseSk(merchandiseId),
      },
      UpdateExpression: "SET favoriteCount = if_not_exists(favoriteCount, :zero) + :delta",
      ConditionExpression: "attribute_exists(merchantId)",
      ExpressionAttributeValues: {
        ":zero": 0,
        ":delta": delta,
      },
    }),
  );
}

// 操作履歴に 1 件追記する。1 レコードが際限なく太らないよう、古いものから捨てて上限件数に収める。
export function appendMerchandiseHistory(
  history: MerchandiseHistoryEvent[] | undefined,
  event: MerchandiseHistoryEvent,
): MerchandiseHistoryEvent[] {
  return [...(history ?? []), event].slice(-MERCHANDISE_HISTORY_MAX_ENTRIES);
}

export type UpdateMerchandiseStatusOptions = {
  updatedAt?: string;
  // 公開状態を切り替えた提携企業ユーザー。誰がいつ公開／非公開にしたかを残す。
  actor?: MerchandiseAuditActor;
  // appendMerchandiseHistory で組み立て済みの履歴。渡された場合のみ上書きする。
  history?: MerchandiseHistoryEvent[];
};

export async function updateMerchandiseStatus(
  config: MerchandiseTableConfig,
  merchantId: string,
  merchandiseId: string,
  status: MerchandiseStatus,
  options?: UpdateMerchandiseStatusOptions,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  const updatedAt = options?.updatedAt ?? new Date().toISOString();
  const setExpressions = [
    "#status = :status",
    "gsi1pk = :gsi1pk",
    "gsi1sk = :gsi1sk",
    "updatedAt = :updatedAt",
  ];
  const expressionAttributeValues: Record<string, unknown> = {
    ":status": status,
    ":gsi1pk": buildMerchandiseByStatusGsiPk(status),
    ":gsi1sk": buildMerchandiseByStatusGsiSk(merchantId, merchandiseId),
    ":updatedAt": updatedAt,
  };

  if (status === "PUBLISHED") {
    setExpressions.push("publishedAt = if_not_exists(publishedAt, :publishedAt)");
    expressionAttributeValues[":publishedAt"] = updatedAt;
  }

  if (options?.actor) {
    setExpressions.push("updatedBy = :updatedBy");
    expressionAttributeValues[":updatedBy"] = options.actor;
  }

  if (options?.history) {
    setExpressions.push("#history = :history");
    expressionAttributeValues[":history"] = options.history;
  }

  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        merchantId,
        sk: buildMerchandiseSk(merchandiseId),
      },
      UpdateExpression: `SET ${setExpressions.join(", ")}`,
      ExpressionAttributeNames: {
        "#status": "status",
        ...(options?.history ? { "#history": "history" } : {}),
      },
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );
}
