import "server-only";

import { getOperatorNotificationEmails, resolveSystemSettingTableName } from "../dynamodb/system-setting";
import { listOperatorUsers } from "../dynamodb/user";
import { readRequiredServerEnv } from "../env/server";

const DEFAULT_OPERATOR_NOTIFICATION_EMAIL = "correcre-info@efficient-technology.com";
const NOTIFIABLE_OPERATOR_STATUSES = new Set(["INVITED", "ACTIVE"]);

function addEmails(target: Set<string>, emails: readonly string[]) {
  for (const email of emails) {
    const normalized = email.trim().toLowerCase();
    if (normalized) {
      target.add(normalized);
    }
  }
}

export async function resolveOperatorNotificationRecipients(input: {
  region?: string;
  systemSettingTableName?: string;
  userTableName?: string;
  fallbackEmail?: string;
} = {}): Promise<string[]> {
  const region = input.region ?? readRequiredServerEnv("AWS_REGION");
  const systemSettingTableName = input.systemSettingTableName ?? resolveSystemSettingTableName();
  const fallbackEmail = input.fallbackEmail?.trim() || DEFAULT_OPERATOR_NOTIFICATION_EMAIL;
  const recipients = new Set<string>();

  const configuredEmails = systemSettingTableName
    ? await getOperatorNotificationEmails({
        region,
        tableName: systemSettingTableName,
      })
    : [];
  addEmails(recipients, configuredEmails);

  const userTableName = input.userTableName?.trim() || process.env.DDB_USER_TABLE_NAME?.trim();

  if (userTableName) {
    try {
      const operators = await listOperatorUsers({
        region,
        tableName: userTableName,
      });
      addEmails(
        recipients,
        operators.filter((user) => NOTIFIABLE_OPERATOR_STATUSES.has(user.status)).map((user) => user.email),
      );
    } catch (error) {
      console.warn("Failed to resolve operator user notification emails.", {
        tableName: userTableName,
        error,
      });
    }
  }

  if (!recipients.size) {
    recipients.add(fallbackEmail);
  }

  return [...recipients];
}
