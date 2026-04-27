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

function readProfileArg(): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--profile" && i + 1 < args.length) {
      return args[i + 1];
    }
    if (args[i].startsWith("--profile=")) {
      return args[i].slice("--profile=".length);
    }
  }
  return undefined;
}

const STAGE = (process.env.STAGE ?? "stg") as Stage;
const REGION = process.env.AWS_REGION ?? "ap-northeast-1";
const PROFILE = readProfileArg() ?? process.env.AWS_PROFILE;

const TARGET_COMPANY_IDS = ["seed-poor-company", "seed-good-company"];

// 保守オーナー用に手動で作成したユーザーは削除対象から除外する。
// 会社自体は削除されるため、ここに含めるユーザーは reset 後も DynamoDB 上に残る
// が、会社行は再シードで再生成されるまで孤立する点に注意。
const PRESERVED_USER_KEYS: Array<{ companyId: string; userId: string }> = [
  { companyId: "seed-poor-company", userId: "u-007" },
  { companyId: "seed-good-company", userId: "u-007" },
];

function isPreservedUser(companyId: string, userId: string | undefined): boolean {
  if (!userId) return false;
  return PRESERVED_USER_KEYS.some((key) => key.companyId === companyId && key.userId === userId);
}

const TABLES = {
  company: `correcre-company-${STAGE}`,
  user: `correcre-user-${STAGE}`,
  department: `correcre-department-${STAGE}`,
  mission: `correcre-mission-${STAGE}`,
  missionHistory: `correcre-mission-history-${STAGE}`,
  missionReport: `correcre-mission-report-${STAGE}`,
  userMonthlyStats: `correcre-user-monthly-stats-${STAGE}`,
  exchangeHistory: `correcre-exchange-history-${STAGE}`,
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
  const deletableUsers = users.filter((u) => !isPreservedUser(companyId, u["userId"] as string | undefined));
  await batchDelete(
    client,
    TABLES.user,
    deletableUsers.map((u) => ({ companyId, sk: u["sk"] })),
  );
  const preservedCount = users.length - deletableUsers.length;
  if (preservedCount > 0) {
    console.log(`  ${TABLES.user}: preserved ${preservedCount}`);
  }

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
  const deletableReports = reportsViaGsi.filter((r) => !isPreservedUser(companyId, r["userId"] as string | undefined));
  await batchDelete(
    client,
    TABLES.missionReport,
    deletableReports.map((r) => ({ pk: r["pk"], sk: r["sk"] })),
  );

  // UserMonthlyStats (GSI gsi1pk = COMPANY#cid)
  const statsViaGsi = await queryAllByIndex(
    client,
    TABLES.userMonthlyStats,
    "UserMonthlyStatsByCompanyYearMonth",
    "gsi1pk = :gsi1pk",
    { ":gsi1pk": `COMPANY#${companyId}` },
  );
  const deletableStats = statsViaGsi.filter((s) => !isPreservedUser(companyId, s["userId"] as string | undefined));
  await batchDelete(
    client,
    TABLES.userMonthlyStats,
    deletableStats.map((s) => ({ pk: s["pk"], sk: s["sk"] })),
  );

  // ExchangeHistory (GSI gsi1pk = COMPANY#cid)
  const exchangesViaGsi = await queryAllByIndex(
    client,
    TABLES.exchangeHistory,
    "ExchangeHistoryByCompanyExchangedAt",
    "gsi1pk = :gsi1pk",
    { ":gsi1pk": `COMPANY#${companyId}` },
  );
  const deletableExchanges = exchangesViaGsi.filter((e) => !isPreservedUser(companyId, e["userId"] as string | undefined));
  await batchDelete(
    client,
    TABLES.exchangeHistory,
    deletableExchanges.map((e) => ({ pk: e["pk"], sk: e["sk"] })),
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
