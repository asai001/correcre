/**
 * 導入企業（Company）に請求対象人数 `billableEmployees`（有効 + 招待中）を集計して書き込む
 * backfill スクリプト。
 *
 * 2026-10-14 定例で、月額請求の対象を「有効」に加えて「招待中」のユーザーにも広げた。
 * 2026-10-28 定例で、従業員ロールを持たない管理者・運用担当は対象外にした。
 * アプリはユーザーの追加・削除・ステータス変更のたびに会社の人数を再集計するが、それまでの間
 * 既存の会社レコードには billableEmployees がなく、有効ユーザー数だけで請求額が出てしまう。
 * このスクリプトで全社を一度に集計し直す。
 *
 * 対象テーブル: correcre-company-<stage>（ユーザー数は correcre-user-<stage> から数える）
 * 影響を受けるフィールド:
 *   - totalEmployees / activeEmployees / billableEmployees: ユーザーテーブルから再集計
 *   - monthlyBillingSnapshots[当月]: 再集計した人数で当月分を書き直す（過去月はそのまま）
 *   - updatedAt: 実行時刻へ更新
 *
 * 実行例（dry-run）:
 *   STAGE=dev AWS_PROFILE=CorreCre-Dev-Account npx ts-node scripts/backfill-company-billable-employees.ts --dry-run
 *
 * 実際に書き込み:
 *   STAGE=dev AWS_PROFILE=CorreCre-Dev-Account npx ts-node scripts/backfill-company-billable-employees.ts
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

type Stage = "dev" | "stg" | "prod";

type UserItem = {
  companyId: string;
  status?: string;
  roles?: string[];
};

type CompanyItem = {
  companyId: string;
  status: string;
  monthlyBaseFee?: number;
  perEmployeeMonthlyFee?: number;
  totalEmployees?: number;
  activeEmployees?: number;
  billableEmployees?: number;
  monthlyBillingSnapshots?: Record<string, unknown>;
};

const STAGE = (process.env.STAGE ?? "dev") as Stage;
const REGION = process.env.AWS_REGION ?? "ap-northeast-1";
const PROFILE = process.env.AWS_PROFILE;
const DRY_RUN = process.argv.includes("--dry-run");

// アプリ側（@correcre/lib/company-billing の isBillableUser）と同じく、
// 従業員ロールを持つ有効・招待中のユーザーを請求対象にする（ロール未設定は従業員扱い）。
const BILLABLE_USER_STATUSES = new Set(["ACTIVE", "INVITED"]);

function isBillableUser(user: UserItem) {
  return BILLABLE_USER_STATUSES.has(user.status ?? "") && (user.roles ?? ["EMPLOYEE"]).includes("EMPLOYEE");
}

async function scanAll<T>(client: DynamoDBDocumentClient, tableName: string): Promise<T[]> {
  const items: T[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (result.Items?.length) {
      items.push(...(result.Items as T[]));
    }

    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

// 請求の対象月は日本時間で区切る（アプリの toBillingSnapshotMonth と同じ）。
function toJstYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function toNonNegativeInteger(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

async function main() {
  const companyTableName = `correcre-company-${STAGE}`;
  const userTableName = `correcre-user-${STAGE}`;
  const baseClient = new DynamoDBClient({
    region: REGION,
    credentials: PROFILE ? fromIni({ profile: PROFILE }) : undefined,
  });
  const client = DynamoDBDocumentClient.from(baseClient);

  console.log(`[backfill] companyTable=${companyTableName} userTable=${userTableName} dryRun=${DRY_RUN}`);
  const [companies, users] = await Promise.all([
    scanAll<CompanyItem>(client, companyTableName),
    scanAll<UserItem>(client, userTableName),
  ]);
  console.log(`[backfill] scanned companies=${companies.length} users=${users.length}`);

  const now = new Date();
  const updatedAt = now.toISOString();
  const month = toJstYearMonth(now);
  let touched = 0;
  let unchanged = 0;

  for (const company of companies) {
    const currentUsers = users.filter((user) => user.companyId === company.companyId && user.status !== "DELETED");
    const totalEmployees = currentUsers.length;
    const activeEmployees = currentUsers.filter((user) => user.status === "ACTIVE").length;
    const billableEmployees = currentUsers.filter(isBillableUser).length;

    if (
      company.billableEmployees === billableEmployees &&
      company.activeEmployees === activeEmployees &&
      company.totalEmployees === totalEmployees
    ) {
      unchanged += 1;
      continue;
    }

    const monthlyBaseFee = toNonNegativeInteger(company.monthlyBaseFee);
    const perEmployeeMonthlyFee = toNonNegativeInteger(company.perEmployeeMonthlyFee);
    const snapshot = {
      month,
      status: company.status,
      activeEmployees,
      billableEmployees,
      monthlyBaseFee,
      perEmployeeMonthlyFee,
      monthlyIncomeYen: company.status === "INACTIVE" ? 0 : monthlyBaseFee + billableEmployees * perEmployeeMonthlyFee,
      capturedAt: updatedAt,
    };

    touched += 1;

    if (DRY_RUN) {
      console.log(
        `[backfill] would update companyId=${company.companyId} ` +
          `total=${company.totalEmployees ?? "-"}->${totalEmployees} ` +
          `active=${company.activeEmployees ?? "-"}->${activeEmployees} ` +
          `billable=${company.billableEmployees ?? "-"}->${billableEmployees} ` +
          `${month} income=${snapshot.monthlyIncomeYen}`,
      );
    } else {
      await client.send(
        new UpdateCommand({
          TableName: companyTableName,
          Key: { companyId: company.companyId },
          UpdateExpression:
            "SET totalEmployees = :totalEmployees, activeEmployees = :activeEmployees, billableEmployees = :billableEmployees, monthlyBillingSnapshots = :monthlyBillingSnapshots, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":totalEmployees": totalEmployees,
            ":activeEmployees": activeEmployees,
            ":billableEmployees": billableEmployees,
            ":monthlyBillingSnapshots": {
              ...(company.monthlyBillingSnapshots ?? {}),
              [month]: snapshot,
            },
            ":updatedAt": updatedAt,
          },
        }),
      );
    }
  }

  console.log(`[backfill] done touched=${touched} unchanged=${unchanged}`);
}

main().catch((err) => {
  console.error("[backfill] failed", err);
  process.exit(1);
});
