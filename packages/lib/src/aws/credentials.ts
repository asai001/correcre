import "server-only";

const PROFILE_BY_STAGE = {
  dev: "CorreCre-Dev-Account",
  stg: "CorreCre-Stg-Account",
  prod: "CorreCre-Prod-Account",
} as const;

function normalizeEnvValue(value?: string) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function hasExplicitAwsEnvCredentials() {
  return Boolean(
    normalizeEnvValue(process.env.AWS_ACCESS_KEY_ID) && normalizeEnvValue(process.env.AWS_SECRET_ACCESS_KEY),
  );
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

export function getResolvedAwsProfile() {
  if (hasExplicitAwsEnvCredentials()) {
    return undefined;
  }

  const explicitProfile = normalizeEnvValue(process.env.AWS_PROFILE);
  if (explicitProfile) {
    return explicitProfile;
  }

  const detectedStage = detectStageFromTableNames();
  return detectedStage ? PROFILE_BY_STAGE[detectedStage] : undefined;
}

export function isAwsCredentialError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "CredentialsProviderError" ||
    error.message.includes("Could not load credentials from any providers") ||
    error.message.includes("Error when retrieving token from sso") ||
    error.message.includes("The SSO session associated with this profile has expired")
  );
}

export function buildAwsCredentialErrorMessage() {
  const profile = getResolvedAwsProfile();

  if (profile) {
    return [
      "DynamoDB にアクセスするための AWS 認証情報が見つからないか、有効期限が切れています。",
      `ローカルでは \`AWS_PROFILE=${profile}\` を使い、\`aws sso login --profile ${profile}\` を実行してください。`,
    ].join(" ");
  }

  return [
    "DynamoDB にアクセスするための AWS 認証情報が見つかりません。",
    "`AWS_PROFILE` または `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` を設定してください。",
  ].join(" ");
}
