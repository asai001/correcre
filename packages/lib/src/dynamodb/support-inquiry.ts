import "server-only";

import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { SupportInquiryItem, SupportInquirySource, SupportInquiryStatus } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type SupportInquiryTableConfig = {
  region: string;
  tableName: string;
};

export type ListSupportInquiriesInput = {
  limit?: number;
  source?: SupportInquirySource | "ALL";
  status?: SupportInquiryStatus | "ALL";
};

export const SUPPORT_INQUIRY_BY_CREATED_AT_INDEX = "SupportInquiryByCreatedAt";
export const SUPPORT_INQUIRY_BY_STATUS_CREATED_AT_INDEX = "SupportInquiryByStatusCreatedAt";

const TABLE_NAME_STAGE_PATTERN = /^correcre-(user|company|merchant|exchange-history|system-setting)-(.+)$/;
const DEFAULT_LIST_LIMIT = 200;
const MAX_LIST_LIMIT = 500;

export function buildSupportInquiryPk(inquiryId: string) {
  return `INQUIRY#${inquiryId}` as const;
}

export function buildSupportInquiryCreatedAtGsiSk(createdAt: string, inquiryId: string) {
  return `CREATED_AT#${createdAt}#INQUIRY#${inquiryId}` as const;
}

export function buildSupportInquiryStatusGsiPk(status: SupportInquiryStatus) {
  return `STATUS#${status}` as const;
}

export function resolveSupportInquiryTableName(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const configured = env.DDB_SUPPORT_INQUIRY_TABLE_NAME?.trim();
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
      return `correcre-support-inquiry-${match[2]}`;
    }
  }

  return undefined;
}

export function isSupportInquiryTableMissingError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ResourceNotFoundException"
  );
}

function normalizeLimit(limit?: number) {
  if (!Number.isFinite(limit)) {
    return DEFAULT_LIST_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(limit ?? DEFAULT_LIST_LIMIT), 1), MAX_LIST_LIMIT);
}

export async function putSupportInquiry(
  config: SupportInquiryTableConfig,
  item: SupportInquiryItem,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );
}

export async function listSupportInquiries(
  config: SupportInquiryTableConfig,
  input: ListSupportInquiriesInput = {},
): Promise<SupportInquiryItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const limit = normalizeLimit(input.limit);
  const source = input.source && input.source !== "ALL" ? input.source : undefined;
  const status = input.status && input.status !== "ALL" ? input.status : undefined;
  const items: SupportInquiryItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const useStatusIndex = Boolean(status);
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: useStatusIndex ? SUPPORT_INQUIRY_BY_STATUS_CREATED_AT_INDEX : SUPPORT_INQUIRY_BY_CREATED_AT_INDEX,
        KeyConditionExpression: useStatusIndex ? "gsi2pk = :pk" : "gsi1pk = :pk",
        ExpressionAttributeValues: {
          ":pk": useStatusIndex ? buildSupportInquiryStatusGsiPk(status!) : "SUPPORT_INQUIRY",
        },
        ScanIndexForward: false,
        Limit: Math.min(limit * 2, MAX_LIST_LIMIT),
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    for (const item of (Items as SupportInquiryItem[] | undefined) ?? []) {
      if (source && item.source !== source) {
        continue;
      }
      items.push(item);
      if (items.length >= limit) {
        return items;
      }
    }

    exclusiveStartKey = LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey);

  return items;
}

export async function updateSupportInquiryStatus(
  config: SupportInquiryTableConfig,
  input: {
    inquiryId: string;
    status: SupportInquiryStatus;
    updatedBy: string;
    updatedAt?: string;
  },
): Promise<SupportInquiryItem> {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const client = getDynamoDocumentClient(config.region);
  const { Attributes } = await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        pk: buildSupportInquiryPk(input.inquiryId),
      },
      ConditionExpression: "attribute_exists(pk)",
      UpdateExpression:
        "SET #status = :status, updatedAt = :updatedAt, statusUpdatedAt = :updatedAt, statusUpdatedBy = :updatedBy, gsi2pk = :gsi2pk",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": input.status,
        ":updatedAt": updatedAt,
        ":updatedBy": input.updatedBy,
        ":gsi2pk": buildSupportInquiryStatusGsiPk(input.status),
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return Attributes as SupportInquiryItem;
}

export async function updateSupportInquiryNotificationResult(
  config: SupportInquiryTableConfig,
  input: {
    inquiryId: string;
    notifiedAt?: string;
    recipients?: readonly string[];
    errorMessage?: string;
  },
): Promise<void> {
  const updatedAt = new Date().toISOString();
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {
    ":updatedAt": updatedAt,
  };
  const setExpressions = ["updatedAt = :updatedAt"];
  const removeExpressions: string[] = [];

  if (input.notifiedAt) {
    values[":notifiedAt"] = input.notifiedAt;
    setExpressions.push("notifiedAt = :notifiedAt");
  }

  if (input.recipients) {
    values[":recipients"] = [...input.recipients];
    setExpressions.push("notificationRecipients = :recipients");
  }

  if (input.errorMessage) {
    values[":notificationError"] = input.errorMessage;
    setExpressions.push("notificationError = :notificationError");
  } else {
    names["#notificationError"] = "notificationError";
    removeExpressions.push("#notificationError");
  }

  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        pk: buildSupportInquiryPk(input.inquiryId),
      },
      ConditionExpression: "attribute_exists(pk)",
      UpdateExpression: [
        `SET ${setExpressions.join(", ")}`,
        removeExpressions.length ? `REMOVE ${removeExpressions.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: values,
    }),
  );
}
