import "server-only";

import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

import type { NotificationSettingItem } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type SystemSettingTableConfig = {
  region: string;
  tableName: string;
};

export const NOTIFICATION_SETTING_KEY = "NOTIFICATION";

const TABLE_NAME_STAGE_PATTERN = /^correcre-(user|company|merchant|exchange-history)-(.+)$/;

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

export function resolveSystemSettingTableName(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const configured = env.DDB_SYSTEM_SETTING_TABLE_NAME?.trim();
  if (configured) {
    return configured;
  }

  const sourceTableNames = [
    env.DDB_USER_TABLE_NAME,
    env.DDB_COMPANY_TABLE_NAME,
    env.DDB_MERCHANT_TABLE_NAME,
    env.DDB_EXCHANGE_HISTORY_TABLE_NAME,
  ];

  for (const tableName of sourceTableNames) {
    const normalized = tableName?.trim();
    const match = normalized ? TABLE_NAME_STAGE_PATTERN.exec(normalized) : null;

    if (match) {
      return `correcre-system-setting-${match[2]}`;
    }
  }

  return undefined;
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
