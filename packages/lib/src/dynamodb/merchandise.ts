import "server-only";

import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { Merchandise, MerchandiseStatus } from "@correcre/types";

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

export async function putMerchandise(config: MerchandiseTableConfig, item: Merchandise): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
    }),
  );
}

export async function updateMerchandiseStatus(
  config: MerchandiseTableConfig,
  merchantId: string,
  merchandiseId: string,
  status: MerchandiseStatus,
  updatedAt: string = new Date().toISOString(),
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
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
      },
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );
}
