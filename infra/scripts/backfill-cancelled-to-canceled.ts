/**
 * `ExchangeHistoryItem.status` のレガシー値 `CANCELLED`（英国スペル）を
 * 新仕様 `CANCELED` に書き換える backfill スクリプト。
 *
 * Phase 1 で enum を拡張した際、既存レコードとの互換性のため `CANCELLED` を
 * 読取互換として残置した。Phase 5 の仕上げとして書込みも `CANCELED` に統一する。
 *
 * 対象テーブル: correcre-exchange-history-<stage>
 * 影響を受けるフィールド:
 *   - status: "CANCELLED" -> "CANCELED"
 *   - gsi2pk: "MERCHANT#<id>#STATUS#CANCELLED" -> "MERCHANT#<id>#STATUS#CANCELED"
 *     （未設定の場合はスキップ）
 *   - history[].status: "CANCELLED" -> "CANCELED"（過去の遷移ログも整える）
 *
 * 実行例（dry-run）:
 *   STAGE=dev AWS_PROFILE=CorreCre-Dev-Account npx ts-node scripts/backfill-cancelled-to-canceled.ts --dry-run
 *
 * 実際に書き込み:
 *   STAGE=dev AWS_PROFILE=CorreCre-Dev-Account npx ts-node scripts/backfill-cancelled-to-canceled.ts
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

type Stage = "dev" | "stg" | "prod";

type ExchangeHistoryStatus =
  | "REQUESTED"
  | "PREPARING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELED"
  | "CANCELLED";

type StatusEvent = {
  status: ExchangeHistoryStatus;
  occurredAt: string;
  actorType: string;
  actorId?: string;
  comment?: string;
};

type ExchangeHistoryItem = {
  pk: string;
  sk: string;
  status?: ExchangeHistoryStatus;
  history?: StatusEvent[];
  gsi2pk?: string;
  merchantId?: string;
};

const STAGE = (process.env.STAGE ?? "dev") as Stage;
const REGION = process.env.AWS_REGION ?? "ap-northeast-1";
const PROFILE = process.env.AWS_PROFILE;
const DRY_RUN = process.argv.includes("--dry-run");

function buildTableName(stage: Stage) {
  return `correcre-exchange-history-${stage}`;
}

async function scanAll(client: DynamoDBDocumentClient, tableName: string): Promise<ExchangeHistoryItem[]> {
  const items: ExchangeHistoryItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (result.Items?.length) {
      items.push(...(result.Items as ExchangeHistoryItem[]));
    }

    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

function rewriteHistory(history: StatusEvent[] | undefined): StatusEvent[] | null {
  if (!history?.length) return null;
  let changed = false;
  const next = history.map((event) => {
    if (event.status === "CANCELLED") {
      changed = true;
      return { ...event, status: "CANCELED" as const };
    }
    return event;
  });
  return changed ? next : null;
}

function rewriteGsi2(gsi2pk: string | undefined): string | null {
  if (!gsi2pk) return null;
  if (!gsi2pk.endsWith("#STATUS#CANCELLED")) return null;
  return gsi2pk.replace("#STATUS#CANCELLED", "#STATUS#CANCELED");
}

async function updateItem(
  client: DynamoDBDocumentClient,
  tableName: string,
  item: ExchangeHistoryItem,
  newStatus: ExchangeHistoryStatus | null,
  newHistory: StatusEvent[] | null,
  newGsi2pk: string | null,
) {
  const sets: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  if (newStatus) {
    sets.push("#status = :status");
    names["#status"] = "status";
    values[":status"] = newStatus;
  }
  if (newHistory) {
    sets.push("#history = :history");
    names["#history"] = "history";
    values[":history"] = newHistory;
  }
  if (newGsi2pk) {
    sets.push("gsi2pk = :gsi2pk");
    values[":gsi2pk"] = newGsi2pk;
  }

  if (sets.length === 0) return;

  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: item.pk, sk: item.sk },
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
      ExpressionAttributeValues: values,
    }),
  );
}

async function main() {
  const tableName = buildTableName(STAGE);
  const baseClient = new DynamoDBClient({
    region: REGION,
    credentials: PROFILE ? fromIni({ profile: PROFILE }) : undefined,
  });
  const client = DynamoDBDocumentClient.from(baseClient);

  console.log(`[backfill] table=${tableName} dryRun=${DRY_RUN}`);
  const items = await scanAll(client, tableName);
  console.log(`[backfill] scanned ${items.length} items`);

  let touched = 0;
  let statusChanged = 0;
  let historyChanged = 0;
  let gsi2Changed = 0;

  for (const item of items) {
    const newStatus = item.status === "CANCELLED" ? "CANCELED" : null;
    const newHistory = rewriteHistory(item.history);
    const newGsi2 = rewriteGsi2(item.gsi2pk);

    if (!newStatus && !newHistory && !newGsi2) continue;

    touched += 1;
    if (newStatus) statusChanged += 1;
    if (newHistory) historyChanged += 1;
    if (newGsi2) gsi2Changed += 1;

    if (DRY_RUN) {
      console.log(
        `[backfill] would update pk=${item.pk} sk=${item.sk} status=${newStatus ?? "-"} history=${newHistory ? "y" : "-"} gsi2=${newGsi2 ?? "-"}`,
      );
    } else {
      await updateItem(client, tableName, item, newStatus, newHistory, newGsi2);
    }
  }

  console.log(
    `[backfill] done touched=${touched} status=${statusChanged} history=${historyChanged} gsi2=${gsi2Changed}`,
  );
}

main().catch((err) => {
  console.error("[backfill] failed", err);
  process.exit(1);
});
