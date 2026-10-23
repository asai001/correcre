import "server-only";

import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

import type { MerchantBroadcastLogItem } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";
import type { SystemSettingTableConfig } from "./system-setting";

// 一斉メールの送信履歴は件数が少ない（運用者が手動で送るもの）ため、
// 専用テーブルを作らず system-setting テーブルに 1 送信 1 アイテムで保存する。
const MERCHANT_BROADCAST_KEY_PREFIX = "MERCHANT_BROADCAST#";

export function buildMerchantBroadcastSettingKey(sentAt: string, broadcastId: string) {
  return `${MERCHANT_BROADCAST_KEY_PREFIX}${sentAt}#${broadcastId}` as const;
}

export async function putMerchantBroadcastLog(
  config: SystemSettingTableConfig,
  item: MerchantBroadcastLogItem,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
    }),
  );
}

// 新しい順に返す。
export async function listMerchantBroadcastLogs(config: SystemSettingTableConfig): Promise<MerchantBroadcastLogItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const items: MerchantBroadcastLogItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new ScanCommand({
        TableName: config.tableName,
        FilterExpression: "begins_with(settingKey, :prefix)",
        ExpressionAttributeValues: {
          ":prefix": MERCHANT_BROADCAST_KEY_PREFIX,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      items.push(...(Items as MerchantBroadcastLogItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items.sort((left, right) => right.sentAt.localeCompare(left.sentAt));
}
