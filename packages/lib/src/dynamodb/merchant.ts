import "server-only";

import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { Merchant } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type MerchantTableConfig = {
  region: string;
  tableName: string;
};

export async function getMerchantById(config: MerchantTableConfig, merchantId: string): Promise<Merchant | null> {
  const client = getDynamoDocumentClient(config.region);
  const { Item } = await client.send(
    new GetCommand({
      TableName: config.tableName,
      Key: {
        merchantId,
      },
    }),
  );

  return (Item as Merchant | undefined) ?? null;
}

export async function listMerchants(config: MerchantTableConfig): Promise<Merchant[]> {
  const client = getDynamoDocumentClient(config.region);
  const merchants: Merchant[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new ScanCommand({
        TableName: config.tableName,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      merchants.push(...(Items as Merchant[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return merchants;
}

export async function putMerchant(config: MerchantTableConfig, merchant: Merchant): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: merchant,
    }),
  );
}

export async function touchMerchant(config: MerchantTableConfig, merchantId: string, updatedAt: string): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        merchantId,
      },
      UpdateExpression: "SET updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":updatedAt": updatedAt,
      },
    }),
  );
}
