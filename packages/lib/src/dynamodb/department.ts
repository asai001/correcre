import "server-only";

import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { Department } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type DepartmentTableConfig = {
  region: string;
  tableName: string;
};

export function buildDepartmentSk(departmentId: string) {
  return `DEPT#${departmentId}` as const;
}

export async function listDepartmentsByCompany(config: DepartmentTableConfig, companyId: string): Promise<Department[]> {
  const client = getDynamoDocumentClient(config.region);
  const departments: Department[] = [];
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
      departments.push(...(Items as Department[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return departments;
}

export async function putDepartment(config: DepartmentTableConfig, department: Department): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: department,
    }),
  );
}

export async function updateDepartmentName(
  config: DepartmentTableConfig,
  companyId: string,
  departmentId: string,
  name: string,
  updatedAt: string,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        companyId,
        sk: buildDepartmentSk(departmentId),
      },
      UpdateExpression: "SET #name = :name, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":name": name,
        ":updatedAt": updatedAt,
      },
    }),
  );
}

export async function deleteDepartment(
  config: DepartmentTableConfig,
  companyId: string,
  departmentId: string,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new DeleteCommand({
      TableName: config.tableName,
      Key: {
        companyId,
        sk: buildDepartmentSk(departmentId),
      },
    }),
  );
}
