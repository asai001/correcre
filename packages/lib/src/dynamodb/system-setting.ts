import "server-only";

import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

import type { NotificationSettingItem } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type SystemSettingTableConfig = {
  region: string;
  tableName: string;
};

export const NOTIFICATION_SETTING_KEY = "NOTIFICATION";

export function isSystemSettingTableMissingError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ResourceNotFoundException"
  );
}

function normalizeEmails(emails: readonly string[]): string[] {
  return [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

export async function getNotificationSetting(
  config: SystemSettingTableConfig,
): Promise<NotificationSettingItem | null> {
  const client = getDynamoDocumentClient(config.region);

  try {
    const { Item } = await client.send(
      new GetCommand({
        TableName: config.tableName,
        Key: { settingKey: NOTIFICATION_SETTING_KEY },
      }),
    );
    return (Item as NotificationSettingItem | undefined) ?? null;
  } catch (error) {
    // テーブル未作成（infra 未デプロイ）の場合は「未設定」として扱い、
    // 読み取り側のフォールバック動作を維持する。
    if (isSystemSettingTableMissingError(error)) {
      console.warn(`System setting table "${config.tableName}" not found. Treating as unconfigured.`);
      return null;
    }
    throw error;
  }
}

export async function putNotificationSetting(
  config: SystemSettingTableConfig,
  input: { operatorNotificationEmails: readonly string[]; updatedBy?: string },
): Promise<NotificationSettingItem> {
  const item: NotificationSettingItem = {
    settingKey: NOTIFICATION_SETTING_KEY,
    operatorNotificationEmails: normalizeEmails(input.operatorNotificationEmails),
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy,
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

// 設定済みの運用者宛通知メールアドレス一覧。未設定の場合は空配列。
// 旧形式（operatorNotificationEmail 単一）で保存された値も読み取れる。
export async function getOperatorNotificationEmails(
  config: SystemSettingTableConfig,
): Promise<string[]> {
  const setting = await getNotificationSetting(config);

  if (setting?.operatorNotificationEmails?.length) {
    return normalizeEmails(setting.operatorNotificationEmails);
  }

  if (setting?.operatorNotificationEmail) {
    return normalizeEmails([setting.operatorNotificationEmail]);
  }

  return [];
}
