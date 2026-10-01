import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  ListTablesCommand,
  waitUntilTableExists,
  waitUntilTableNotExists,
} from "@aws-sdk/client-dynamodb";

import { TEST_REGION, synthesizeDynamoTables, toCreateTableInput } from "./cdk-tables";

const endpoint = process.env.DDB_ENDPOINT?.trim() || "http://127.0.0.1:8000";

function createAdminClient() {
  return new DynamoDBClient({
    endpoint,
    region: TEST_REGION,
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  });
}

async function listAllTables(client: DynamoDBClient): Promise<string[]> {
  const names: string[] = [];
  let startTableName: string | undefined;

  do {
    const { TableNames, LastEvaluatedTableName } = await client.send(
      new ListTablesCommand({ ExclusiveStartTableName: startTableName }),
    );
    names.push(...(TableNames ?? []));
    startTableName = LastEvaluatedTableName;
  } while (startTableName);

  return names;
}

async function waitForEndpoint(client: DynamoDBClient, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await client.send(new ListTablesCommand({ Limit: 1 }));
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  throw new Error(
    [
      `DynamoDB Local に接続できません (DDB_ENDPOINT=${endpoint})。`,
      "`docker compose -f docker-compose.test.yml up -d` で起動するか、DDB_ENDPOINT に稼働中のエンドポイントを指定してください。",
      `最後のエラー: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    ].join("\n"),
  );
}

// 各テスト実行の前に、CDK 定義から全テーブルを作り直す。
// テストデータは各テストが一意な ID で作るためテーブルの中身は共有してよいが、
// 定義変更（GSI 追加など）を確実に反映させるため毎回作り直す。
export default async function setup() {
  const client = createAdminClient();
  await waitForEndpoint(client);

  const tables = synthesizeDynamoTables();
  const existing = new Set(await listAllTables(client));

  for (const table of tables) {
    const input = toCreateTableInput(table);
    const tableName = input.TableName!;

    if (existing.has(tableName)) {
      await client.send(new DeleteTableCommand({ TableName: tableName }));
      await waitUntilTableNotExists({ client, maxWaitTime: 60 }, { TableName: tableName });
    }

    await client.send(new CreateTableCommand(input));
    await waitUntilTableExists({ client, maxWaitTime: 60 }, { TableName: tableName });
  }

  client.destroy();
}
