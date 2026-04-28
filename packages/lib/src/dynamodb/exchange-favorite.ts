import "server-only";

import { DeleteCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import type {
  ExchangeFavoriteItem,
  ExchangeFavoriteRecord,
  ExchangeSavedFilterCriteria,
  ExchangeSavedFilterItem,
} from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type ExchangeFavoriteTableConfig = {
  region: string;
  tableName: string;
};

export function buildExchangeFavoritePk(companyId: string, userId: string) {
  return `COMPANY#${companyId}#USER#${userId}` as const;
}

export function buildExchangeFavoriteSk(merchantId: string, merchandiseId: string) {
  return `FAVORITE#${merchantId}#${merchandiseId}` as const;
}

export function buildExchangeSavedFilterSk(filterId: string) {
  return `SAVED_FILTER#${filterId}` as const;
}

export async function listFavoritesAndSavedFilters(
  config: ExchangeFavoriteTableConfig,
  companyId: string,
  userId: string,
): Promise<{ favorites: ExchangeFavoriteItem[]; savedFilters: ExchangeSavedFilterItem[] }> {
  const client = getDynamoDocumentClient(config.region);
  const records: ExchangeFavoriteRecord[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": buildExchangeFavoritePk(companyId, userId),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      records.push(...(Items as ExchangeFavoriteRecord[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  const favorites: ExchangeFavoriteItem[] = [];
  const savedFilters: ExchangeSavedFilterItem[] = [];

  for (const record of records) {
    if (record.recordType === "FAVORITE") {
      favorites.push(record);
    } else if (record.recordType === "SAVED_FILTER") {
      savedFilters.push(record);
    }
  }

  return { favorites, savedFilters };
}

export async function putFavorite(
  config: ExchangeFavoriteTableConfig,
  params: {
    companyId: string;
    userId: string;
    merchantId: string;
    merchandiseId: string;
  },
): Promise<ExchangeFavoriteItem> {
  const now = new Date().toISOString();
  const item: ExchangeFavoriteItem = {
    pk: buildExchangeFavoritePk(params.companyId, params.userId),
    sk: buildExchangeFavoriteSk(params.merchantId, params.merchandiseId),
    recordType: "FAVORITE",
    companyId: params.companyId,
    userId: params.userId,
    merchantId: params.merchantId,
    merchandiseId: params.merchandiseId,
    createdAt: now,
  };

  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
    }),
  );

  return item;
}

export async function deleteFavorite(
  config: ExchangeFavoriteTableConfig,
  params: {
    companyId: string;
    userId: string;
    merchantId: string;
    merchandiseId: string;
  },
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new DeleteCommand({
      TableName: config.tableName,
      Key: {
        pk: buildExchangeFavoritePk(params.companyId, params.userId),
        sk: buildExchangeFavoriteSk(params.merchantId, params.merchandiseId),
      },
    }),
  );
}

export async function putSavedFilter(
  config: ExchangeFavoriteTableConfig,
  params: {
    companyId: string;
    userId: string;
    filterId: string;
    name: string;
    criteria: ExchangeSavedFilterCriteria;
    createdAt?: string;
  },
): Promise<ExchangeSavedFilterItem> {
  const now = new Date().toISOString();
  const item: ExchangeSavedFilterItem = {
    pk: buildExchangeFavoritePk(params.companyId, params.userId),
    sk: buildExchangeSavedFilterSk(params.filterId),
    recordType: "SAVED_FILTER",
    companyId: params.companyId,
    userId: params.userId,
    filterId: params.filterId,
    name: params.name,
    criteria: params.criteria,
    createdAt: params.createdAt ?? now,
    updatedAt: now,
  };

  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
    }),
  );

  return item;
}

export async function deleteSavedFilter(
  config: ExchangeFavoriteTableConfig,
  params: {
    companyId: string;
    userId: string;
    filterId: string;
  },
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new DeleteCommand({
      TableName: config.tableName,
      Key: {
        pk: buildExchangeFavoritePk(params.companyId, params.userId),
        sk: buildExchangeSavedFilterSk(params.filterId),
      },
    }),
  );
}
