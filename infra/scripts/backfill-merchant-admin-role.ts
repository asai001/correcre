/**
 * 既存の提携企業ユーザー（MerchantUser）へ管理者ロール `MERCHANT_ADMIN` を付与する
 * backfill スクリプト。
 *
 * 提携企業の複数ユーザー対応で、ユーザー追加は「運用者」または提携企業側の「管理者」
 * のみが行える仕様になった。ロール導入前に作成された既存ユーザーは全員が実質的な
 * 主担当（1 社 1 ユーザー運用）だったため、一律で管理者へ昇格させる。
 *
 * 対象テーブル: correcre-merchant-user-<stage>
 * 影響を受けるフィールド:
 *   - roles: "MERCHANT_ADMIN" を含まない場合に追加（status=DELETED は対象外）
 *   - updatedAt: 実行時刻へ更新
 *
 * 個別に一般ユーザーへ戻したい場合は、運用者アプリの提携企業ユーザー管理画面の
 * 「一般にする」で変更できる。
 *
 * 実行例（dry-run）:
 *   STAGE=dev AWS_PROFILE=CorreCre-Dev-Account npx ts-node scripts/backfill-merchant-admin-role.ts --dry-run
 *
 * 実際に書き込み:
 *   STAGE=dev AWS_PROFILE=CorreCre-Dev-Account npx ts-node scripts/backfill-merchant-admin-role.ts
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

type Stage = "dev" | "stg" | "prod";

type MerchantUserRole = "MERCHANT" | "MERCHANT_ADMIN";

type MerchantUserItem = {
  merchantId: string;
  sk: string;
  userId?: string;
  roles?: MerchantUserRole[];
  status?: string;
};

const STAGE = (process.env.STAGE ?? "dev") as Stage;
const REGION = process.env.AWS_REGION ?? "ap-northeast-1";
const PROFILE = process.env.AWS_PROFILE;
const DRY_RUN = process.argv.includes("--dry-run");

function buildTableName(stage: Stage) {
  return `correcre-merchant-user-${stage}`;
}

async function scanAll(client: DynamoDBDocumentClient, tableName: string): Promise<MerchantUserItem[]> {
  const items: MerchantUserItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (result.Items?.length) {
      items.push(...(result.Items as MerchantUserItem[]));
    }

    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
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

  const now = new Date().toISOString();
  let touched = 0;
  let skippedDeleted = 0;
  let skippedAlreadyAdmin = 0;

  for (const item of items) {
    if (item.status === "DELETED") {
      skippedDeleted += 1;
      continue;
    }

    const roles = item.roles ?? [];

    if (roles.includes("MERCHANT_ADMIN")) {
      skippedAlreadyAdmin += 1;
      continue;
    }

    // MERCHANT が欠けている不正データもここで補正する（ログイン判定は MERCHANT を見るため）。
    const newRoles: MerchantUserRole[] = roles.includes("MERCHANT")
      ? [...roles, "MERCHANT_ADMIN"]
      : ["MERCHANT", ...roles, "MERCHANT_ADMIN"];

    touched += 1;

    if (DRY_RUN) {
      console.log(
        `[backfill] would update merchantId=${item.merchantId} sk=${item.sk} roles=${JSON.stringify(roles)} -> ${JSON.stringify(newRoles)}`,
      );
    } else {
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { merchantId: item.merchantId, sk: item.sk },
          UpdateExpression: "SET #roles = :roles, updatedAt = :updatedAt",
          ExpressionAttributeNames: { "#roles": "roles" },
          ExpressionAttributeValues: {
            ":roles": newRoles,
            ":updatedAt": now,
          },
        }),
      );
    }
  }

  console.log(
    `[backfill] done touched=${touched} skippedDeleted=${skippedDeleted} skippedAlreadyAdmin=${skippedAlreadyAdmin}`,
  );
}

main().catch((err) => {
  console.error("[backfill] failed", err);
  process.exit(1);
});
