import "server-only";

import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

import type { Company } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type CompanyTableConfig = {
  region: string;
  tableName: string;
};

export async function getCompanyById(config: CompanyTableConfig, companyId: string): Promise<Company | null> {
  const client = getDynamoDocumentClient(config.region);
  const { Item } = await client.send(
    new GetCommand({
      TableName: config.tableName,
      Key: {
        companyId,
      },
    }),
  );

  return (Item as Company | undefined) ?? null;
}

export async function listCompanies(config: CompanyTableConfig): Promise<Company[]> {
  const client = getDynamoDocumentClient(config.region);
  const companies: Company[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new ScanCommand({
        TableName: config.tableName,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      companies.push(...(Items as Company[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return companies;
}

export async function putCompany(config: CompanyTableConfig, company: Company): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: company,
    }),
  );
}
