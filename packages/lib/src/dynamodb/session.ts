import "server-only";

import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { DBSessionItem } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type SessionTableConfig = {
  region: string;
  tableName: string;
};

export const SESSION_BY_COGNITO_SUB_INDEX = "SessionByCognitoSub";

export function buildSessionPk(sessionId: string) {
  return `SESSION#${sessionId}` as const;
}

export function buildSessionByCognitoSubGsiPk(cognitoSub: string) {
  return `COGNITO_SUB#${cognitoSub}` as const;
}

export function buildSessionByCognitoSubGsiSk(createdAt: string) {
  return `CREATED_AT#${createdAt}` as const;
}

export async function getSession(config: SessionTableConfig, sessionId: string): Promise<DBSessionItem | null> {
  const client = getDynamoDocumentClient(config.region);
  const { Item } = await client.send(
    new GetCommand({
      TableName: config.tableName,
      Key: { pk: buildSessionPk(sessionId) },
    }),
  );

  return (Item as DBSessionItem | undefined) ?? null;
}

export async function putSession(config: SessionTableConfig, session: DBSessionItem): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: session,
    }),
  );
}

export async function updateSessionLastActiveAt(
  config: SessionTableConfig,
  sessionId: string,
  lastActiveAt: string,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: { pk: buildSessionPk(sessionId) },
      UpdateExpression: "SET lastActiveAt = :lastActiveAt",
      ExpressionAttributeValues: { ":lastActiveAt": lastActiveAt },
      ConditionExpression: "attribute_exists(pk)",
    }),
  );
}

export async function revokeSession(
  config: SessionTableConfig,
  sessionId: string,
  revokedAt: string = new Date().toISOString(),
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: { pk: buildSessionPk(sessionId) },
      UpdateExpression: "SET revokedAt = :revokedAt",
      ExpressionAttributeValues: { ":revokedAt": revokedAt },
      ConditionExpression: "attribute_exists(pk)",
    }),
  );
}

export async function deleteSession(config: SessionTableConfig, sessionId: string): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new DeleteCommand({
      TableName: config.tableName,
      Key: { pk: buildSessionPk(sessionId) },
    }),
  );
}

export async function listSessionsByCognitoSub(
  config: SessionTableConfig,
  cognitoSub: string,
): Promise<DBSessionItem[]> {
  const normalized = cognitoSub.trim();

  if (!normalized) {
    return [];
  }

  const client = getDynamoDocumentClient(config.region);
  const sessions: DBSessionItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: SESSION_BY_COGNITO_SUB_INDEX,
        KeyConditionExpression: "gsi1pk = :gsi1pk",
        ExpressionAttributeValues: { ":gsi1pk": buildSessionByCognitoSubGsiPk(normalized) },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      sessions.push(...(Items as DBSessionItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return sessions;
}

export async function revokeAllSessionsByCognitoSub(
  config: SessionTableConfig,
  cognitoSub: string,
  revokedAt: string = new Date().toISOString(),
): Promise<number> {
  const sessions = await listSessionsByCognitoSub(config, cognitoSub);
  let revokedCount = 0;

  for (const session of sessions) {
    if (session.revokedAt) {
      continue;
    }

    await revokeSession(config, session.sessionId, revokedAt);
    revokedCount += 1;
  }

  return revokedCount;
}
