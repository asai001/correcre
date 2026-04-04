import "server-only";

const PROFILE_BY_STAGE = {
  dev: "CorreCre-Dev-Account",
  stg: "CorreCre-Stg-Account",
  prod: "CorreCre-Prod-Account",
} as const;

type ResolvedAwsCredentialSource =
  | { type: "default" }
  | { type: "profile"; profile: string }
  | { type: "static-env" }
  | { type: "vercel-oidc"; roleArn: string };

function normalizeEnvValue(value?: string) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function hasExplicitAwsEnvCredentials() {
  return Boolean(
    normalizeEnvValue(process.env.AWS_ACCESS_KEY_ID) && normalizeEnvValue(process.env.AWS_SECRET_ACCESS_KEY),
  );
}

function isManagedRuntime() {
  return Boolean(normalizeEnvValue(process.env.VERCEL) || normalizeEnvValue(process.env.CI));
}

function getResolvedAwsRoleArnFromVercelOidc() {
  const roleArn = normalizeEnvValue(process.env.AWS_ROLE_ARN);

  if (!roleArn) {
    return undefined;
  }

  const isVercelRuntime = Boolean(normalizeEnvValue(process.env.VERCEL));
  const hasLocalVercelOidcToken = Boolean(normalizeEnvValue(process.env.VERCEL_OIDC_TOKEN));

  return isVercelRuntime || hasLocalVercelOidcToken ? roleArn : undefined;
}

function detectStageFromTableNames() {
  const tableNames = [
    process.env.DDB_USER_TABLE_NAME,
    process.env.DDB_COMPANY_TABLE_NAME,
    process.env.DDB_DEPARTMENT_TABLE_NAME,
    process.env.DDB_MISSION_TABLE_NAME,
    process.env.DDB_MISSION_REPORT_TABLE_NAME,
    process.env.DDB_USER_MONTHLY_STATS_TABLE_NAME,
    process.env.DDB_EXCHANGE_HISTORY_TABLE_NAME,
    process.env.DDB_POINT_TRANSACTION_TABLE_NAME,
  ]
    .map(normalizeEnvValue)
    .filter((tableName): tableName is string => Boolean(tableName));

  if (tableNames.some((tableName) => tableName.endsWith("-dev"))) {
    return "dev" as const;
  }

  if (tableNames.some((tableName) => tableName.endsWith("-stg"))) {
    return "stg" as const;
  }

  if (tableNames.some((tableName) => tableName.endsWith("-prod"))) {
    return "prod" as const;
  }

  return undefined;
}

export function getResolvedAwsCredentialSource(): ResolvedAwsCredentialSource {
  if (hasExplicitAwsEnvCredentials()) {
    return { type: "static-env" };
  }

  const roleArn = getResolvedAwsRoleArnFromVercelOidc();
  if (roleArn) {
    return { type: "vercel-oidc", roleArn };
  }

  const explicitProfile = normalizeEnvValue(process.env.AWS_PROFILE);
  if (explicitProfile) {
    return { type: "profile", profile: explicitProfile };
  }

  if (isManagedRuntime()) {
    return { type: "default" };
  }

  const detectedStage = detectStageFromTableNames();
  return detectedStage ? { type: "profile", profile: PROFILE_BY_STAGE[detectedStage] } : { type: "default" };
}

export function getResolvedAwsProfile() {
  const source = getResolvedAwsCredentialSource();
  return source.type === "profile" ? source.profile : undefined;
}

export function getResolvedAwsRoleArn() {
  const source = getResolvedAwsCredentialSource();
  return source.type === "vercel-oidc" ? source.roleArn : undefined;
}

export function isAwsCredentialError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "CredentialsProviderError" ||
    error.name === "VercelOidcTokenError" ||
    error.message.includes("Could not load credentials from any providers") ||
    error.message.includes("Error when retrieving token from sso") ||
    error.message.includes("The SSO session associated with this profile has expired") ||
    error.message.includes("x-vercel-oidc-token") ||
    error.message.includes("OIDC option enabled in the Vercel project settings") ||
    error.message.includes("AssumeRoleWithWebIdentity") ||
    error.message.includes("OpenIDConnect provider") ||
    error.message.includes("InvalidIdentityToken")
  );
}

export function buildAwsCredentialErrorMessage() {
  const source = getResolvedAwsCredentialSource();

  if (source.type === "vercel-oidc") {
    if (normalizeEnvValue(process.env.VERCEL)) {
      return [
        "DynamoDB にアクセスするための AWS OIDC 認証に失敗しました。",
        "Vercel の Project Settings で OIDC を有効化し、`AWS_ROLE_ARN` に `sts:AssumeRoleWithWebIdentity` を許可した IAM Role ARN を設定してください。",
      ].join(" ");
    }

    return [
      "DynamoDB にアクセスするための AWS OIDC 認証に失敗しました。",
      "`AWS_ROLE_ARN` が設定されています。ローカル開発では `vercel env pull .env.local --yes` を実行して `VERCEL_OIDC_TOKEN` を更新してください。",
    ].join(" ");
  }

  if (normalizeEnvValue(process.env.VERCEL)) {
    return [
      "DynamoDB にアクセスするための AWS 認証情報が見つかりません。",
      "Vercel では OIDC を使う構成です。Project Settings で OIDC を有効化し、`AWS_ROLE_ARN` を設定してください。",
    ].join(" ");
  }

  if (source.type === "profile") {
    return [
      "DynamoDB にアクセスするための AWS 認証情報が見つからないか、有効期限が切れています。",
      `ローカルでは \`AWS_PROFILE=${source.profile}\` を使います。 \`aws sso login --profile ${source.profile}\` を実行してください。`,
    ].join(" ");
  }

  if (source.type === "static-env") {
    return [
      "DynamoDB にアクセスするための AWS 認証に失敗しました。",
      "`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` と、必要なら `AWS_SESSION_TOKEN` の値を確認してください。",
    ].join(" ");
  }

  return [
    "DynamoDB にアクセスするための AWS 認証情報が見つかりません。",
    "`AWS_PROFILE` または `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` を設定してください。",
  ].join(" ");
}
