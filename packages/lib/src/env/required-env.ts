// アプリごとに「本番で設定されていないと画面やバッチが動かない」環境変数の一覧と、ビルド時のチェック。
// 各アプリの next.config.ts から呼び、本番（VERCEL_ENV=production）のビルドで不足があればビルドを失敗させる。
// Vercel はビルドが失敗すると本番を差し替えないため、設定漏れがあっても稼働中の本番は壊れない。
//
// 環境変数を読むコードを追加・変更したら、この一覧と各アプリの README も合わせて更新すること。
// next.config.ts から読み込むため、server-only や他モジュールへの依存を持たせない。

export type CorrecreAppName = "admin" | "employee" | "merchant" | "operator";

// 全アプリ共通: DynamoDB へのアクセス（Vercel OIDC）とログインセッション
const COMMON_REQUIRED_ENV = [
  "AWS_REGION",
  "AWS_ROLE_ARN",
  "SESSION_SECRET",
  "DDB_SESSION_TABLE_NAME",
] as const;

// コード上は任意扱いでも、本番で抜けると黙って挙動が変わるものも含める
// （例: *_APP_URL が無いと通知メールから画面へのリンクが消える、
//  employee の DDB_MERCHANT_CALENDAR_TABLE_NAME が無いと休業日を無視した候補日になる）。
export const REQUIRED_ENV_BY_APP: Record<CorrecreAppName, readonly string[]> = {
  admin: [
    ...COMMON_REQUIRED_ENV,
    "ADMIN_COGNITO_REGION",
    "ADMIN_COGNITO_USER_POOL_ID",
    "ADMIN_COGNITO_APP_CLIENT_ID",
    "DDB_COMPANY_TABLE_NAME",
    "DDB_DEPARTMENT_TABLE_NAME",
    "DDB_EXCHANGE_HISTORY_TABLE_NAME",
    "DDB_MISSION_TABLE_NAME",
    "DDB_MISSION_REPORT_TABLE_NAME",
    "DDB_POINT_TRANSACTION_TABLE_NAME",
    "DDB_USER_MONTHLY_STATS_TABLE_NAME",
    "DDB_USER_TABLE_NAME",
    "S3_MISSION_REPORT_IMAGE_BUCKET_NAME",
    "OPERATOR_APP_URL",
  ],
  employee: [
    ...COMMON_REQUIRED_ENV,
    "EMPLOYEE_COGNITO_REGION",
    "EMPLOYEE_COGNITO_USER_POOL_ID",
    "EMPLOYEE_COGNITO_APP_CLIENT_ID",
    "DDB_COMPANY_TABLE_NAME",
    "DDB_EXCHANGE_FAVORITE_TABLE_NAME",
    "DDB_EXCHANGE_HISTORY_TABLE_NAME",
    "DDB_MERCHANDISE_TABLE_NAME",
    "DDB_MERCHANT_CALENDAR_TABLE_NAME",
    "DDB_MERCHANT_TABLE_NAME",
    "DDB_MERCHANT_USER_TABLE_NAME",
    "DDB_MISSION_HISTORY_TABLE_NAME",
    "DDB_MISSION_REPORT_TABLE_NAME",
    "DDB_MISSION_TABLE_NAME",
    "DDB_POINT_TRANSACTION_TABLE_NAME",
    "DDB_SCHEDULE_EVENT_TABLE_NAME",
    "DDB_USER_MONTHLY_STATS_TABLE_NAME",
    "DDB_USER_TABLE_NAME",
    "S3_MERCHANDISE_IMAGE_BUCKET_NAME",
    "S3_MISSION_REPORT_IMAGE_BUCKET_NAME",
    "EMPLOYEE_APP_URL",
    "MERCHANT_APP_URL",
  ],
  merchant: [
    ...COMMON_REQUIRED_ENV,
    "MERCHANT_COGNITO_REGION",
    "MERCHANT_COGNITO_USER_POOL_ID",
    "MERCHANT_COGNITO_APP_CLIENT_ID",
    "DDB_COMPANY_TABLE_NAME",
    "DDB_EXCHANGE_FAVORITE_TABLE_NAME",
    "DDB_EXCHANGE_HISTORY_TABLE_NAME",
    "DDB_MERCHANDISE_TABLE_NAME",
    "DDB_MERCHANT_CALENDAR_TABLE_NAME",
    "DDB_MERCHANT_TABLE_NAME",
    "DDB_MERCHANT_USER_TABLE_NAME",
    "DDB_POINT_TRANSACTION_TABLE_NAME",
    "DDB_SCHEDULE_EVENT_TABLE_NAME",
    "DDB_USER_TABLE_NAME",
    "S3_MERCHANDISE_IMAGE_BUCKET_NAME",
    "EMPLOYEE_APP_URL",
    "MERCHANT_APP_URL",
  ],
  operator: [
    ...COMMON_REQUIRED_ENV,
    "OPERATOR_COGNITO_REGION",
    "OPERATOR_COGNITO_USER_POOL_ID",
    "OPERATOR_COGNITO_APP_CLIENT_ID",
    // 提携企業ユーザーの招待・管理（merchant 用 User Pool）
    "MERCHANT_COGNITO_REGION",
    "MERCHANT_COGNITO_USER_POOL_ID",
    "DDB_COMPANY_TABLE_NAME",
    "DDB_DEPARTMENT_TABLE_NAME",
    "DDB_EXCHANGE_HISTORY_TABLE_NAME",
    "DDB_MERCHANDISE_TABLE_NAME",
    "DDB_MERCHANT_CALENDAR_TABLE_NAME",
    "DDB_MERCHANT_TABLE_NAME",
    "DDB_MERCHANT_USER_TABLE_NAME",
    "DDB_MISSION_HISTORY_TABLE_NAME",
    "DDB_MISSION_TABLE_NAME",
    "DDB_OPERATOR_AUDIT_LOG_TABLE_NAME",
    "DDB_POINT_TRANSACTION_TABLE_NAME",
    "DDB_SCHEDULE_EVENT_TABLE_NAME",
    "DDB_SYSTEM_SETTING_TABLE_NAME",
    "DDB_USER_TABLE_NAME",
    "S3_MERCHANDISE_IMAGE_BUCKET_NAME",
    "EMPLOYEE_APP_URL",
    "MERCHANT_APP_URL",
    // 日次バッチ（Vercel Cron）の認証。無いとバッチが毎回 503 で止まる
    "CRON_SECRET",
  ],
};

type EnvSource = Record<string, string | undefined>;

export function findMissingEnv(names: readonly string[], env: EnvSource): string[] {
  return names.filter((name) => !env[name]?.trim());
}

/**
 * next.config.ts から呼ぶビルド時チェック。
 * - 本番（VERCEL_ENV=production）: 不足があれば例外でビルドを失敗させる
 * - プレビュー（stage 等）: 不足をビルドログに警告として出すだけ（ブランチごとの検証用デプロイを止めない）
 * - ローカル（VERCEL_ENV なし）: 何もしない
 */
export function assertRequiredEnvForDeploy(app: CorrecreAppName, env: EnvSource = process.env): void {
  const vercelEnv = env.VERCEL_ENV;
  if (!vercelEnv) {
    return;
  }

  const missing = findMissingEnv(REQUIRED_ENV_BY_APP[app], env);
  if (missing.length === 0) {
    return;
  }

  const message = [
    `[required-env] ${app} アプリの ${vercelEnv} 環境に、次の環境変数が設定されていません:`,
    ...missing.map((name) => `  - ${name}`),
    "Vercel の Project Settings > Environment Variables で設定してから再デプロイしてください。",
    "一覧は packages/lib/src/env/required-env.ts と apps/" + app + "/README.md にあります。",
  ].join("\n");

  if (vercelEnv === "production") {
    throw new Error(message);
  }

  console.warn(message);
}
