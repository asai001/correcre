/**
 * seed-maintenance.ts で投入した 2 社分のデータを DynamoDB から削除する。
 *
 * 実行例:
 *   STAGE=stg AWS_PROFILE=CorreCre-Stg-Account npx ts-node scripts/reset-maintenance-seed.ts
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

type Stage = "dev" | "stg" | "prod";

const STAGE = (process.env.STAGE ?? "stg") as Stage;
const REGION = process.env.AWS_REGION ?? "ap-northeast-1";
const PROFILE = process.env.AWS_PROFILE;

const TARGET_COMPANY_IDS = ["seed-poor-company", "seed-good-company"];

const TABLES = {
  company: `correcre-company-${STAGE}`,
  user: `correcre-user-${STAGE}`,
  department: `correcre-department-${STAGE}`,
  mission: `correcre-mission-${STAGE}`,
  missionHistory: `correcre-mission-history-${STAGE}`,
  missionReport: `correcre-mission-report-${STAGE}`,
  userMonthlyStats: `correcre-user-monthly-stats-${STAGE}`,
};

function buildClient() {
  const client = new DynamoDBClient({
    region: REGION,
    ...(PROFILE ? { credentials: fromIni({ profile: PROFILE }) } : {}),
  });
  return DynamoDBDocumentClient.from(client);
}

type DynamoItem = Record<string, unknown>;
type DynamoKey = Record<string, unknown>;

async function queryAll(client: DynamoDBDocumentClient, tableName: string, expression: string, values: Record<string, string>): Promise<DynamoItem[]> {
  const items: DynamoItem[] = [];
  let startKey: DynamoKey | undefined = undefined;
  while (true) {
    const res = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: expression,
        ExpressionAttributeValues: values,
        ExclusiveStartKey: startKey,
      }),
    );
    if (res.Items?.length) items.push(...(res.Items as DynamoItem[]));
    const next: DynamoKey | undefined = res.LastEvaluatedKey as DynamoKey | undefined;
    if (!next) break;
    startKey = next;
  }
  return items;
}

async function queryAllByIndex(
  client: DynamoDBDocumentClient,
  tableName: string,
  indexName: string,
  expression: string,
  values: Record<string, string>,
): Promise<DynamoItem[]> {
  const items: DynamoItem[] = [];
  let startKey: DynamoKey | undefined = undefined;
  while (true) {
    const res = await client.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: expression,
        ExpressionAttributeValues: values,
        ExclusiveStartKey: startKey,
      }),
    );
    if (res.Items?.length) items.push(...(res.Items as DynamoItem[]));
    const next: DynamoKey | undefined = res.LastEvaluatedKey as DynamoKey | undefined;
    if (!next) break;
    startKey = next;
  }
  return items;
}

async function scanAll(client: DynamoDBDocumentClient, tableName: string, filter: string, values: Record<string, string>): Promise<DynamoItem[]> {
  const items: DynamoItem[] = [];
  let startKey: DynamoKey | undefined = undefined;
  while (true) {
    const res = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: filter,
        ExpressionAttributeValues: values,
        ExclusiveStartKey: startKey,
      }),
    );
    if (res.Items?.length) items.push(...(res.Items as DynamoItem[]));
    const next: DynamoKey | undefined = res.LastEvaluatedKey as DynamoKey | undefined;
    if (!next) break;
    startKey = next;
  }
  return items;
}

async function batchDelete(client: DynamoDBDocumentClient, tableName: string, keys: Record<string, unknown>[]): Promise<void> {
  const CHUNK = 25;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const chunk = keys.slice(i, i + CHUNK);
    let unprocessed: Record<string, { DeleteRequest: { Key: Record<string, unknown> } }[]> | undefined = {
      [tableName]: chunk.map((Key) => ({ DeleteRequest: { Key } })),
    };
    let retry = 0;
    while (unprocessed && Object.keys(unprocessed).length > 0) {
      const res = await client.send(new BatchWriteCommand({ RequestItems: unprocessed }));
      const next = res.UnprocessedItems;
      if (!next || Object.keys(next).length === 0) break;
      unprocessed = next as typeof unprocessed;
      retry += 1;
      if (retry > 5) throw new Error(`Failed to drain deletes for ${tableName}`);
      await new Promise((r) => setTimeout(r, 200 * retry));
    }
  }
  console.log(`  ${tableName}: deleted ${keys.length}`);
}

async function deleteCompany(client: DynamoDBDocumentClient, companyId: string): Promise<void> {
  console.log(`\nResetting ${companyId}`);

  // User (PK=companyId, SK=USER#...)
  const users = await queryAll(client, TABLES.user, "companyId = :cid", { ":cid": companyId });
  await batchDelete(
    client,
    TABLES.user,
    users.map((u) => ({ companyId, sk: u["sk"] })),
  );

  // Department (PK=companyId, SK=DEPT#...)
  const depts = await queryAll(client, TABLES.department, "companyId = :cid", { ":cid": companyId });
  await batchDelete(
    client,
    TABLES.department,
    depts.map((d) => ({ companyId, sk: d["sk"] })),
  );

  // Mission (PK=companyId, SK=MISSION#...)
  const missions = await queryAll(client, TABLES.mission, "companyId = :cid", { ":cid": companyId });
  await batchDelete(
    client,
    TABLES.mission,
    missions.map((m) => ({ companyId, sk: m["sk"] })),
  );

  // MissionHistory は pk が COMPANY#cid#MISSION#mid なので Scan で当該会社のみ抽出。
  const histories = await scanAll(client, TABLES.missionHistory, "contains(pk, :token)", { ":token": `COMPANY#${companyId}#MISSION#` });
  await batchDelete(
    client,
    TABLES.missionHistory,
    histories.map((h) => ({ pk: h["pk"], sk: h["sk"] })),
  );

  // MissionReport (GSI1 gsi1pk = COMPANY#cid で一覧)
  const reportsViaGsi = await queryAllByIndex(
    client,
    TABLES.missionReport,
    "MissionReportByCompanyReportedAt",
    "gsi1pk = :gsi1pk",
    { ":gsi1pk": `COMPANY#${companyId}` },
  );
  await batchDelete(
    client,
    TABLES.missionReport,
    reportsViaGsi.map((r) => ({ pk: r["pk"], sk: r["sk"] })),
  );

  // UserMonthlyStats (GSI gsi1pk = COMPANY#cid)
  const statsViaGsi = await queryAllByIndex(
    client,
    TABLES.userMonthlyStats,
    "UserMonthlyStatsByCompanyYearMonth",
    "gsi1pk = :gsi1pk",
    { ":gsi1pk": `COMPANY#${companyId}` },
  );
  await batchDelete(
    client,
    TABLES.userMonthlyStats,
    statsViaGsi.map((s) => ({ pk: s["pk"], sk: s["sk"] })),
  );

  // Company itself (PK=companyId only)
  await client.send(new DeleteCommand({ TableName: TABLES.company, Key: { companyId } }));
  console.log(`  ${TABLES.company}: deleted 1`);
}

async function main(): Promise<void> {
  if (STAGE === "prod") {
    throw new Error("本番環境に対して reset を実行することはできません");
  }
  console.log(`Stage: ${STAGE} / Region: ${REGION} / Profile: ${PROFILE ?? "(default)"}`);
  const client = buildClient();
  for (const companyId of TARGET_COMPANY_IDS) {
    await deleteCompany(client, companyId);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
