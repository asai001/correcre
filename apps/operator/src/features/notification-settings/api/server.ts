import "server-only";

import {
  getNotificationSetting,
  getOperatorNotificationEmails,
  putNotificationSetting,
} from "@correcre/lib/dynamodb/system-setting";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { NotificationSettingsData } from "../model/types";

function getTableConfig() {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    tableName: readRequiredServerEnv("DDB_SYSTEM_SETTING_TABLE_NAME"),
  };
}

export async function getNotificationSettingsData(): Promise<NotificationSettingsData> {
  const config = getTableConfig();
  const [setting, emails] = await Promise.all([
    getNotificationSetting(config),
    getOperatorNotificationEmails(config),
  ]);

  return {
    operatorNotificationEmails: emails,
    updatedAt: setting?.updatedAt,
  };
}

export async function updateOperatorNotificationEmails(input: {
  operatorNotificationEmails: readonly string[];
  updatedBy: string;
}): Promise<NotificationSettingsData> {
  const saved = await putNotificationSetting(getTableConfig(), input);

  return {
    operatorNotificationEmails: saved.operatorNotificationEmails ?? [],
    updatedAt: saved.updatedAt,
  };
}
