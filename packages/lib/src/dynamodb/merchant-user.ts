import "server-only";

import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { MerchantUserItem, MerchantUserStatus } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type MerchantUserTableConfig = {
  region: string;
  tableName: string;
};

export const MERCHANT_USER_BY_COGNITO_SUB_INDEX = "MerchantUserByCognitoSub";
export const MERCHANT_USER_BY_EMAIL_INDEX = "MerchantUserByEmail";

export function buildMerchantUserSk(userId: string) {
  return `USER#${userId}` as const;
}

export function buildMerchantUserByCognitoSubGsiPk(cognitoSub: string) {
  return `COGNITO_SUB#${cognitoSub}` as const;
}

export function buildMerchantUserByEmailGsiPk(email: string) {
  return `EMAIL#${email.trim().toLowerCase()}` as const;
}

export async function getMerchantUserByMerchantAndUserId(
  config: MerchantUserTableConfig,
  merchantId: string,
  userId: string,
): Promise<MerchantUserItem | null> {
  const client = getDynamoDocumentClient(config.region);
  const { Item } = await client.send(
    new GetCommand({
      TableName: config.tableName,
      Key: {
        merchantId,
        sk: buildMerchantUserSk(userId),
      },
    }),
  );

  return (Item as MerchantUserItem | undefined) ?? null;
}

export async function listMerchantUsersByCognitoSub(
  config: MerchantUserTableConfig,
  cognitoSub: string,
): Promise<MerchantUserItem[]> {
  const normalizedCognitoSub = cognitoSub.trim();

  if (!normalizedCognitoSub) {
    return [];
  }

  const client = getDynamoDocumentClient(config.region);
  const users: MerchantUserItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: MERCHANT_USER_BY_COGNITO_SUB_INDEX,
        KeyConditionExpression: "gsi1pk = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": buildMerchantUserByCognitoSubGsiPk(normalizedCognitoSub),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      users.push(...(Items as MerchantUserItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return users;
}

export async function listMerchantUsersByMerchant(
  config: MerchantUserTableConfig,
  merchantId: string,
): Promise<MerchantUserItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const users: MerchantUserItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "merchantId = :merchantId",
        ExpressionAttributeValues: {
          ":merchantId": merchantId,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      users.push(...(Items as MerchantUserItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return users;
}

export async function listMerchantUsersByEmail(
  config: MerchantUserTableConfig,
  email: string,
): Promise<MerchantUserItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const { Items } = await client.send(
    new QueryCommand({
      TableName: config.tableName,
      IndexName: MERCHANT_USER_BY_EMAIL_INDEX,
      KeyConditionExpression: "gsi2pk = :gsi2pk",
      ExpressionAttributeValues: {
        ":gsi2pk": buildMerchantUserByEmailGsiPk(email),
      },
    }),
  );

  return (Items as MerchantUserItem[] | undefined) ?? [];
}

export async function putMerchantUser(config: MerchantUserTableConfig, user: MerchantUserItem): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: user,
    }),
  );
}

export async function updateMerchantUserLastLoginAtByCognitoSub(
  config: MerchantUserTableConfig,
  cognitoSub: string,
  loggedInAt: string = new Date().toISOString(),
): Promise<MerchantUserItem | null> {
  const users = await listMerchantUsersByCognitoSub(config, cognitoSub);
  const user = users[0];

  if (!user) {
    return null;
  }

  const client = getDynamoDocumentClient(config.region);
  const shouldPromoteToActive = user.status === "INVITED";
  const setExpressions = ["lastLoginAt = :lastLoginAt", "updatedAt = :updatedAt"];
  const expressionAttributeValues: Record<string, unknown> = {
    ":lastLoginAt": loggedInAt,
    ":updatedAt": loggedInAt,
  };
  const expressionAttributeNames: Record<string, string> = {};

  if (shouldPromoteToActive) {
    setExpressions.push("#status = :status");
    expressionAttributeNames["#status"] = "status";
    expressionAttributeValues[":status"] = "ACTIVE";
  }

  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        merchantId: user.merchantId,
        sk: user.sk,
      },
      UpdateExpression: `SET ${setExpressions.join(", ")}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );

  return {
    ...user,
    lastLoginAt: loggedInAt,
    status: shouldPromoteToActive ? "ACTIVE" : user.status,
    updatedAt: loggedInAt,
  };
}

export async function updateMerchantUserStatus(
  config: MerchantUserTableConfig,
  merchantId: string,
  userId: string,
  status: MerchantUserStatus,
  updatedAt: string = new Date().toISOString(),
): Promise<MerchantUserItem | null> {
  const user = await getMerchantUserByMerchantAndUserId(config, merchantId, userId);

  if (!user) {
    return null;
  }

  const client = getDynamoDocumentClient(config.region);

  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        merchantId,
        sk: buildMerchantUserSk(userId),
      },
      UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":updatedAt": updatedAt,
      },
    }),
  );

  return {
    ...user,
    status,
    updatedAt,
  };
}
