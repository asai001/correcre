import "server-only";

import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

import type { MerchantCalendarItem } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type MerchantCalendarTableConfig = {
  region: string;
  tableName: string;
};

export async function getMerchantCalendar(
  config: MerchantCalendarTableConfig,
  merchantId: string,
): Promise<MerchantCalendarItem | null> {
  const client = getDynamoDocumentClient(config.region);
  const { Item } = await client.send(
    new GetCommand({
      TableName: config.tableName,
      Key: {
        merchantId,
      },
    }),
  );

  return (Item as MerchantCalendarItem | undefined) ?? null;
}

export async function putMerchantCalendar(
  config: MerchantCalendarTableConfig,
  calendar: MerchantCalendarItem,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: calendar,
    }),
  );
}
