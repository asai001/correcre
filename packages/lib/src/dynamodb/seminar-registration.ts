import "server-only";

import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { SeminarRegistrationItem } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type SeminarRegistrationTableConfig = {
  region: string;
  tableName: string;
};

export type UpsertSeminarRegistrationInput = {
  seminarId: string;
  email: string;
  name: string;
  companyName: string;
  sessionId?: string;
  sessionLabel?: string;
  phoneNumber?: string;
  attendeeCount?: number;
  question?: string;
  userAgent?: string;
  now?: string;
};

const TABLE_NAME_STAGE_PATTERN = /^correcre-(user|company|merchant|exchange-history|system-setting)-(.+)$/;

const REQUIRED_FIELDS = ["seminarId", "email", "name", "companyName"] as const;
const OPTIONAL_FIELDS = [
  "sessionId",
  "sessionLabel",
  "phoneNumber",
  "attendeeCount",
  "question",
  "userAgent",
] as const;

export function buildSeminarRegistrationPk(seminarId: string) {
  return `SEMINAR#${seminarId}` as const;
}

export function buildSeminarRegistrationSk(email: string) {
  return `EMAIL#${email}` as const;
}

/**
 * 専用の環境変数が未設定でも、他テーブル名からステージを推定して解決する。
 * 新しいテーブルを追加した直後に各アプリの環境変数追加が漏れても動くようにするため。
 */
export function resolveSeminarRegistrationTableName(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const configured = env.DDB_SEMINAR_REGISTRATION_TABLE_NAME?.trim();
  if (configured) {
    return configured;
  }

  const sourceTableNames = [
    env.DDB_USER_TABLE_NAME,
    env.DDB_COMPANY_TABLE_NAME,
    env.DDB_MERCHANT_TABLE_NAME,
    env.DDB_EXCHANGE_HISTORY_TABLE_NAME,
    env.DDB_SYSTEM_SETTING_TABLE_NAME,
  ];

  for (const tableName of sourceTableNames) {
    const normalized = tableName?.trim();
    const match = normalized ? TABLE_NAME_STAGE_PATTERN.exec(normalized) : null;

    if (match) {
      return `correcre-seminar-registration-${match[2]}`;
    }
  }

  return undefined;
}

export function isSeminarRegistrationTableMissingError(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { name?: string }).name === "ResourceNotFoundException"
  );
}

/**
 * 同じ説明会・同じメールアドレスなら 1 アイテムに集約する upsert。
 * 再送信時に初回申込日時を失わないよう registeredAt は if_not_exists で保持する。
 */
export async function upsertSeminarRegistration(
  config: SeminarRegistrationTableConfig,
  input: UpsertSeminarRegistrationInput,
): Promise<SeminarRegistrationItem> {
  const now = input.now ?? new Date().toISOString();
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = { ":now": now, ":one": 1 };
  const sets: string[] = [];
  const removes: string[] = [];

  const alias = (field: string) => {
    names[`#${field}`] = field;
    return `#${field}`;
  };

  for (const field of REQUIRED_FIELDS) {
    sets.push(`${alias(field)} = :${field}`);
    values[`:${field}`] = input[field];
  }

  for (const field of OPTIONAL_FIELDS) {
    const value = input[field];

    if (value === undefined) {
      removes.push(alias(field));
      continue;
    }

    sets.push(`${alias(field)} = :${field}`);
    values[`:${field}`] = value;
  }

  sets.push(`${alias("registeredAt")} = if_not_exists(${alias("registeredAt")}, :now)`);
  sets.push(`${alias("updatedAt")} = :now`);
  removes.push(alias("notificationError"));

  const { Attributes } = await getDynamoDocumentClient(config.region).send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        pk: buildSeminarRegistrationPk(input.seminarId),
        sk: buildSeminarRegistrationSk(input.email),
      },
      UpdateExpression: [
        `SET ${sets.join(", ")}`,
        `REMOVE ${removes.join(", ")}`,
        `ADD ${alias("submitCount")} :one`,
      ].join(" "),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    }),
  );

  return Attributes as SeminarRegistrationItem;
}

export async function updateSeminarRegistrationNotificationResult(
  config: SeminarRegistrationTableConfig,
  input: {
    seminarId: string;
    email: string;
    notifiedAt?: string;
    errorMessage?: string;
  },
): Promise<void> {
  const names: Record<string, string> = { "#updatedAt": "updatedAt" };
  const values: Record<string, unknown> = { ":updatedAt": new Date().toISOString() };
  const sets = ["#updatedAt = :updatedAt"];

  if (input.notifiedAt) {
    names["#notifiedAt"] = "notifiedAt";
    values[":notifiedAt"] = input.notifiedAt;
    sets.push("#notifiedAt = :notifiedAt");
  }

  if (input.errorMessage) {
    names["#notificationError"] = "notificationError";
    values[":notificationError"] = input.errorMessage;
    sets.push("#notificationError = :notificationError");
  }

  await getDynamoDocumentClient(config.region).send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        pk: buildSeminarRegistrationPk(input.seminarId),
        sk: buildSeminarRegistrationSk(input.email),
      },
      ConditionExpression: "attribute_exists(pk)",
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}

/** 申込者一覧を初回申込日時の昇順で返す。 */
export async function listSeminarRegistrations(
  config: SeminarRegistrationTableConfig,
  seminarId: string,
): Promise<SeminarRegistrationItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const items: SeminarRegistrationItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": buildSeminarRegistrationPk(seminarId),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((Items as SeminarRegistrationItem[] | undefined) ?? []));
    exclusiveStartKey = LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey);

  return items.sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
}
