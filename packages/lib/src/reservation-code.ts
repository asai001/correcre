import "server-only";

import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { getDynamoDocumentClient } from "./dynamodb/client";
import type { SystemSettingTableConfig } from "./dynamodb/system-setting";

// 予約型サービスの交換番号。全提携企業共通の連番から採番し、COCR-XXXX 形式で表示する。
// UUID の exchangeId は予約時に口頭・備考欄で伝えるには長すぎるため、人が読める番号を別に持つ。

export const RESERVATION_CODE_COUNTER_KEY = "RESERVATION_CODE_COUNTER";

// 4 桁までは 0 埋めして COCR-0001 の形にし、10000 以降は連番の桁数のまま伸ばす。
const RESERVATION_CODE_MIN_DIGITS = 4;

export function formatReservationCode(sequence: number): string {
  return `COCR-${String(sequence).padStart(RESERVATION_CODE_MIN_DIGITS, "0")}`;
}

/**
 * 連番を 1 つ採番して COCR-XXXX 形式で返す。
 * ADD によるアトミック更新のため、並行申請でも重複しない（カウンタアイテムは初回採番時に自動作成）。
 * 採番後に申請の保存が失敗すると欠番になるが、番号の一意性には影響しないため許容する。
 */
export async function allocateReservationCode(config: SystemSettingTableConfig): Promise<string> {
  const client = getDynamoDocumentClient(config.region);

  const { Attributes } = await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: { settingKey: RESERVATION_CODE_COUNTER_KEY },
      UpdateExpression: "ADD #value :one",
      ExpressionAttributeNames: { "#value": "value" },
      ExpressionAttributeValues: { ":one": 1 },
      ReturnValues: "UPDATED_NEW",
    }),
  );

  const sequence = Number((Attributes as { value?: number } | undefined)?.value);
  if (!Number.isFinite(sequence) || sequence <= 0) {
    throw new Error("Failed to allocate reservation code sequence");
  }

  return formatReservationCode(sequence);
}
