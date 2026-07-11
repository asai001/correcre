import "server-only";

import { GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { DBUserItem, DBUserStatus } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";
import {
  buildCompanyMonthlyBillingSnapshot,
  getCompanyById,
  toBillingSnapshotMonth,
  upsertCompanyMonthlyBillingSnapshot,
} from "./company";

export type UserTableConfig = {
  region: string;
  tableName: string;
};

export const USER_BY_COGNITO_SUB_INDEX = "UserByCognitoSub";
export const USER_BY_EMAIL_INDEX = "UserByEmail";
export const USER_BY_DEPARTMENT_INDEX = "UserByDepartment";

export function buildUserSk(userId: string) {
  return `USER#${userId}` as const;
}

export function buildUserByCognitoSubGsiPk(cognitoSub: string) {
  return `COGNITO_SUB#${cognitoSub}` as const;
}

export function buildUserByEmailGsiPk(email: string) {
  return `EMAIL#${email.trim().toLowerCase()}` as const;
}

export function buildUserByDepartmentGsiPk(companyId: string, departmentId: string) {
  return `COMPANY#${companyId}#DEPT#${departmentId}` as const;
}

export function buildUserByDepartmentGsiSk(userId: string) {
  return `USER#${userId}` as const;
}

export async function getUserByCompanyAndUserId(
  config: UserTableConfig,
  companyId: string,
  userId: string,
): Promise<DBUserItem | null> {
  const client = getDynamoDocumentClient(config.region);
  const { Item } = await client.send(
    new GetCommand({
      TableName: config.tableName,
      Key: {
        companyId,
        sk: buildUserSk(userId),
      },
    }),
  );

  return (Item as DBUserItem | undefined) ?? null;
}

export async function getUserByCognitoSub(config: UserTableConfig, cognitoSub: string): Promise<DBUserItem | null> {
  const users = await listUsersByCognitoSub(config, cognitoSub);
  return users[0] ?? null;
}

export async function listUsersByCognitoSub(config: UserTableConfig, cognitoSub: string): Promise<DBUserItem[]> {
  const normalizedCognitoSub = cognitoSub.trim();

  if (!normalizedCognitoSub) {
    return [];
  }

  const client = getDynamoDocumentClient(config.region);
  const users: DBUserItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: USER_BY_COGNITO_SUB_INDEX,
        KeyConditionExpression: "gsi1pk = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": buildUserByCognitoSubGsiPk(normalizedCognitoSub),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      users.push(...(Items as DBUserItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return users;
}

export async function listUsersByCompany(config: UserTableConfig, companyId: string): Promise<DBUserItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const users: DBUserItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "companyId = :companyId",
        ExpressionAttributeValues: {
          ":companyId": companyId,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      users.push(...(Items as DBUserItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return users;
}

export async function listUsersByEmail(config: UserTableConfig, email: string): Promise<DBUserItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const { Items } = await client.send(
    new QueryCommand({
      TableName: config.tableName,
      IndexName: USER_BY_EMAIL_INDEX,
      KeyConditionExpression: "gsi2pk = :gsi2pk",
      ExpressionAttributeValues: {
        ":gsi2pk": buildUserByEmailGsiPk(email),
      },
    }),
  );

  return (Items as DBUserItem[] | undefined) ?? [];
}

// 運用者はロールで引ける GSI が無く任意の companyId で登録されるため、Scan で全件から抽出する（少数の想定）。
export async function listOperatorUsers(config: UserTableConfig): Promise<DBUserItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const users: DBUserItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new ScanCommand({
        TableName: config.tableName,
        FilterExpression: "contains(#roles, :operatorRole)",
        ExpressionAttributeNames: {
          "#roles": "roles",
        },
        ExpressionAttributeValues: {
          ":operatorRole": "OPERATOR",
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      users.push(...(Items as DBUserItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return users;
}

export async function putUser(config: UserTableConfig, user: DBUserItem): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: user,
    }),
  );
}

// 初回ログイン等で INVITED→ACTIVE に昇格した会社の在籍者数・当月課金スナップショットを再集計する。
// 昇格は 1 ユーザーにつき一度きりのため、ログインのホットパスに毎回スキャンを課すことはない。
// 課金額に影響するが致命的ではないため、失敗してもログイン自体は継続させる（best-effort）。
async function resyncCompanyEmployeeCounts(
  config: UserTableConfig,
  companyTableName: string,
  companyId: string,
  updatedAt: string,
): Promise<void> {
  const [company, users] = await Promise.all([
    getCompanyById({ region: config.region, tableName: companyTableName }, companyId),
    listUsersByCompany(config, companyId),
  ]);

  if (!company) {
    return;
  }

  const currentUsers = users.filter((user) => user.status !== "DELETED");
  const activeUsers = currentUsers.filter((user) => user.status === "ACTIVE");
  const billingSnapshot = buildCompanyMonthlyBillingSnapshot({
    month: toBillingSnapshotMonth(updatedAt),
    status: company.status,
    activeEmployees: activeUsers.length,
    perEmployeeMonthlyFee: company.perEmployeeMonthlyFee ?? 0,
    capturedAt: updatedAt,
  });
  const client = getDynamoDocumentClient(config.region);

  await client.send(
    new UpdateCommand({
      TableName: companyTableName,
      Key: {
        companyId,
      },
      UpdateExpression:
        "SET totalEmployees = :totalEmployees, activeEmployees = :activeEmployees, monthlyBillingSnapshots = :monthlyBillingSnapshots, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":totalEmployees": currentUsers.length,
        ":activeEmployees": activeUsers.length,
        ":monthlyBillingSnapshots": upsertCompanyMonthlyBillingSnapshot(company, billingSnapshot),
        ":updatedAt": updatedAt,
      },
    }),
  );
}

export async function updateUserLastLoginAtByCognitoSub(
  config: UserTableConfig & { companyTableName?: string },
  cognitoSub: string,
  loggedInAt: string = new Date().toISOString(),
): Promise<DBUserItem | null> {
  const user = await getUserByCognitoSub(config, cognitoSub);

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
        companyId: user.companyId,
        sk: user.sk,
      },
      UpdateExpression: `SET ${setExpressions.join(", ")}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );

  // 昇格が発生した場合のみ、会社の在籍者数・当月課金スナップショットを再集計する。
  if (shouldPromoteToActive && config.companyTableName) {
    try {
      await resyncCompanyEmployeeCounts(config, config.companyTableName, user.companyId, loggedInAt);
    } catch (error) {
      // 再集計の失敗はログインを妨げない。次の従業員作成/削除/ステータス変更時に是正される。
      console.error("Failed to resync company employee counts after activation", error);
    }
  }

  return {
    ...user,
    lastLoginAt: loggedInAt,
    status: shouldPromoteToActive ? "ACTIVE" : user.status,
    updatedAt: loggedInAt,
  };
}

export async function updateUserStatusByCompanyAndUserId(
  config: UserTableConfig,
  companyId: string,
  userId: string,
  status: DBUserStatus,
  updatedAt: string = new Date().toISOString(),
): Promise<DBUserItem | null> {
  const user = await getUserByCompanyAndUserId(config, companyId, userId);

  if (!user) {
    return null;
  }

  const client = getDynamoDocumentClient(config.region);

  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        companyId,
        sk: buildUserSk(userId),
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
