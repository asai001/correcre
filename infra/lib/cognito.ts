import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import type { InfraStage } from "./infra-stack";

export type CognitoAppType = "admin" | "employee" | "operator" | "merchant";

export type SharedCognitoProps = {
  stage: InfraStage;
  account?: string;
  region?: string;
};

export type InternalCognitoResources = {
  userPool: cognito.UserPool;
  userPoolDomain: cognito.UserPoolDomain;
  adminUserPoolClient: cognito.UserPoolClient;
  employeeUserPoolClient: cognito.UserPoolClient;
  operatorUserPoolClient: cognito.UserPoolClient;
  issuer: string;
  domainPrefix: string;
};

export type MerchantCognitoResources = {
  userPool: cognito.UserPool;
  userPoolDomain: cognito.UserPoolDomain;
  merchantUserPoolClient: cognito.UserPoolClient;
  issuer: string;
  domainPrefix: string;
};

export type SharedCognitoResources = {
  internal: InternalCognitoResources;
  merchant: MerchantCognitoResources;
};

type CustomEmailSenderConfig = {
  fromEmail: string;
  fromName: string;
  sesVerifiedDomain: string;
};

type LoginAppName = "admin" | "employee" | "operator" | "merchant";

type CognitoPoolKind = "internal" | "merchant";

const DEFAULT_CUSTOM_EMAIL_SENDER_CONFIG: CustomEmailSenderConfig = {
  fromEmail: "correcre-info@efficient-technology.com",
  fromName: "コレクレ",
  sesVerifiedDomain: "efficient-technology.com",
};

// Keep production separate so only this object needs to change once the
// dedicated sender address is finalized.
// 本番は correcre.jp ドメインから送信する（SES で correcre.jp のドメイン ID 検証 + DKIM 設定が前提）。
const PROD_CUSTOM_EMAIL_SENDER_CONFIG: CustomEmailSenderConfig = {
  fromEmail: "no-reply@correcre.jp",
  fromName: "コレクレ",
  sesVerifiedDomain: "correcre.jp",
};

const PASSWORD_RESET_EMAIL_SUBJECT = "【コレクレ】パスワード再設定用コードのお知らせ";
const PASSWORD_RESET_EMAIL_HTML_PREFIX = [
  '<div style="font-family: sans-serif; line-height: 1.8; color: #111827;">',
  "<p>いつも コレクレ をご利用いただきありがとうございます。</p>",
  "<p>パスワード再設定のご依頼を受け付けました。<br />以下の確認コードを、パスワード再設定画面に入力してください。</p>",
];
const PASSWORD_RESET_EMAIL_HTML_SUFFIX = [
  "<p>※確認コードの有効期限は 60 分です。<br />※このメールにお心当たりがない場合は、本メールを破棄してください。<br />※確認コードは第三者に共有しないでください。</p>",
  "</div>",
];
const ADMIN_CREATE_USER_EMAIL_SUBJECT = "【コレクレ】アカウント登録のご案内";
const ADMIN_CREATE_USER_EMAIL_HTML_PREFIX = [
  '<div style="font-family: sans-serif; line-height: 1.8; color: #111827;">',
  "<p>コレクレをご利用いただきありがとうございます。</p>",
  "<p>アカウント登録が完了しました。<br />以下のログイン情報をご確認のうえ、初回ログインをお願いいたします。</p>",
];
const ADMIN_CREATE_USER_EMAIL_HTML_SUFFIX = [
  "<p>ログイン後、画面の案内に従って新しいパスワードを設定してください。</p>",
  "<p>このメールに心当たりがない場合は、対応不要です。<br />第三者による誤入力の可能性があります。</p>",
  "<p>今後ともコレクレをよろしくお願いいたします。</p>",
  "</div>",
];
const LOGIN_URLS = {
  dev: {
    admin: "http://localhost:3000/login",
    employee: "http://localhost:3000/login",
    operator: "http://localhost:3002/login",
    merchant: "http://localhost:3003/login",
  },
  stg: {
    admin: "https://correcre-admin-git-stage-asai001s-projects-3e71fbe6.vercel.app/login",
    employee: "https://correcre-employee-git-stage-asai001s-projects-3e71fbe6.vercel.app/login",
    operator: "https://correcre-operator-git-stage-asai001s-projects-3e71fbe6.vercel.app/login",
    merchant: "https://correcre-merchant-git-stage-asai001s-projects-3e71fbe6.vercel.app/login",
  },
  prod: {
    admin: "https://admin.correcre.jp/login",
    employee: "https://app.correcre.jp/login",
    operator: "https://operator.correcre.jp/login",
    merchant: "https://merchant.correcre.jp/login",
  },
} satisfies Record<InfraStage, Record<LoginAppName, string>>;

function buildCognitoDomainPrefix(props: SharedCognitoProps, kind: CognitoPoolKind): string {
  if (!props.account || !props.region) {
    throw new Error("Cognito requires account and region for multi-environment deployment.");
  }

  const parts =
    kind === "merchant"
      ? ["correcre", "auth", "merchant", props.stage, props.account, props.region]
      : ["correcre", "auth", props.stage, props.account, props.region];

  return parts.join("-").toLowerCase();
}

function buildUserPoolName(stage: InfraStage, kind: CognitoPoolKind): string {
  return kind === "merchant" ? `correcre-merchant-users-${stage}` : `correcre-users-${stage}`;
}

function buildUserPoolClientName(appType: CognitoAppType, stage: InfraStage): string {
  return `correcre-${appType}-web-${stage}`;
}

function buildConstructPrefix(appType: CognitoAppType): string {
  switch (appType) {
    case "admin":
      return "Admin";
    case "employee":
      return "Employee";
    case "operator":
      return "Operator";
    case "merchant":
      return "Merchant";
  }
}

function getCustomEmailSenderConfig(stage: InfraStage): CustomEmailSenderConfig {
  return stage === "prod" ? PROD_CUSTOM_EMAIL_SENDER_CONFIG : DEFAULT_CUSTOM_EMAIL_SENDER_CONFIG;
}

function buildCustomMessageLambdaId(kind: CognitoPoolKind): string {
  return kind === "merchant"
    ? "MerchantPasswordResetCustomMessageTrigger"
    : "PasswordResetCustomMessageTrigger";
}

function createCustomMessageTrigger(scope: Construct, stage: InfraStage, kind: CognitoPoolKind) {
  const fixedAppName: LoginAppName | null = kind === "merchant" ? "merchant" : null;
  const description =
    kind === "merchant"
      ? "Customize Cognito forgot-password and admin-create-user emails (merchant pool)."
      : "Customize Cognito forgot-password and admin-create-user emails.";

  return new lambda.Function(scope, buildCustomMessageLambdaId(kind), {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: "index.handler",
    description,
    code: lambda.Code.fromInline(`
const loginUrls = ${JSON.stringify(LOGIN_URLS[stage])};
const fixedAppName = ${JSON.stringify(fixedAppName)};

exports.handler = async (event) => {
  if (
    event.triggerSource !== "CustomMessage_ForgotPassword" &&
    event.triggerSource !== "CustomMessage_AdminCreateUser"
  ) {
    return event;
  }

  const codeParameter = event.request?.codeParameter ?? "{####}";
  const usernameParameter = event.request?.usernameParameter ?? "{username}";
  const escapeHtml = (value) =>
    value.replace(/[&<>"]/g, (character) => {
      switch (character) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        default:
          return character;
      }
    });
  const parseRoles = (value) => {
    if (typeof value !== "string") {
      return [];
    }

    const normalized = value.trim();

    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized);

      if (Array.isArray(parsed)) {
        return parsed
          .map((role) => (typeof role === "string" ? role.trim().toUpperCase() : ""))
          .filter(Boolean);
      }
    } catch (error) {
      // Ignore JSON parsing failures and fall back to comma-separated roles.
    }

    return normalized
      .split(",")
      .map((role) => role.trim().toUpperCase())
      .filter(Boolean);
  };
  const resolveAppName = () => {
    if (fixedAppName) {
      return fixedAppName;
    }

    const rawRoles = event.request?.clientMetadata?.roles ?? "";
    const roles = parseRoles(rawRoles);

    // EMPLOYEE を併せ持つ場合は従業員アプリの URL でよい。
    if (roles.includes("EMPLOYEE")) {
      return "employee";
    }

    // 運用者専用ユーザー（EMPLOYEE を持たない OPERATOR）には運用者アプリの URL を案内する。
    if (roles.includes("OPERATOR")) {
      return "operator";
    }

    return "admin";
  };
  const appName = resolveAppName();
  const loginUrl = loginUrls[appName] ?? loginUrls.admin;

  if (event.triggerSource === "CustomMessage_AdminCreateUser") {
    const adminCreateUserEmailHtmlParts = [
      ...${JSON.stringify(ADMIN_CREATE_USER_EMAIL_HTML_PREFIX)},
      \`<p style="margin: 24px 0 0;">ログインID：<br /><strong>\${escapeHtml(usernameParameter)}</strong></p>\`,
      \`<p style="margin: 24px 0 0;">仮パスワード：<br /><strong>\${escapeHtml(codeParameter)}</strong></p>\`,
      \`<p style="margin: 24px 0 0;">ログイン画面：<br /><a href="\${escapeHtml(loginUrl)}">\${escapeHtml(loginUrl)}</a></p>\`,
      ...${JSON.stringify(ADMIN_CREATE_USER_EMAIL_HTML_SUFFIX)},
    ];

    event.response = {
      ...(event.response ?? {}),
      emailSubject: ${JSON.stringify(ADMIN_CREATE_USER_EMAIL_SUBJECT)},
      emailMessage: adminCreateUserEmailHtmlParts.join(""),
    };

    return event;
  }

  const recoveryEmail = event.request?.userAttributes?.email ?? "";
  const resetUrl =
    \`\${loginUrl}/forgot-password\` +
    (recoveryEmail ? \`?email=\${encodeURIComponent(recoveryEmail)}&sent=1\` : "?sent=1");
  const emailHtmlParts = [
    ...${JSON.stringify(PASSWORD_RESET_EMAIL_HTML_PREFIX)},
    \`<p style="margin: 24px 0; font-size: 16px; font-weight: 700;">確認コード：\${escapeHtml(codeParameter)}</p>\`,
    \`<p style="margin: 24px 0 0;">下記のリンクからパスワード再設定画面を開き、上記の確認コードと新しいパスワードを入力してください。<br /><a href="\${escapeHtml(resetUrl)}">\${escapeHtml(resetUrl)}</a></p>\`,
    ...${JSON.stringify(PASSWORD_RESET_EMAIL_HTML_SUFFIX)},
  ];

  event.response = {
    ...(event.response ?? {}),
    emailSubject: ${JSON.stringify(PASSWORD_RESET_EMAIL_SUBJECT)},
    emailMessage: emailHtmlParts.join(""),
  };

  return event;
};
`),
  });
}

type CreateUserPoolOptions = {
  scope: Construct;
  props: SharedCognitoProps;
  kind: CognitoPoolKind;
  constructId: string;
};

function createUserPool({ scope, props, kind, constructId }: CreateUserPoolOptions) {
  const passwordResetCustomMessageTrigger = createCustomMessageTrigger(scope, props.stage, kind);
  const passwordResetSenderConfig = getCustomEmailSenderConfig(props.stage);

  return new cognito.UserPool(scope, constructId, {
    userPoolName: buildUserPoolName(props.stage, kind),
    selfSignUpEnabled: false,
    mfa: cognito.Mfa.OFF,
    signInAliases: {
      email: true,
    },
    standardAttributes: {
      email: {
        required: false,
        mutable: true,
      },
      familyName: {
        required: false,
        mutable: true,
      },
      givenName: {
        required: false,
        mutable: true,
      },
    },
    passwordPolicy: {
      // Cognito passwordPolicy can enforce the 8+ length requirement, but it
      // cannot restrict passwords to ASCII alphanumeric only. The apps validate
      // the ASCII-only rule before submitting NEW_PASSWORD_REQUIRED.
      minLength: 8,
      requireDigits: false,
      requireLowercase: false,
      requireUppercase: false,
      requireSymbols: false,
      tempPasswordValidity: cdk.Duration.days(7),
    },
    accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    email: cognito.UserPoolEmail.withSES({
      fromEmail: passwordResetSenderConfig.fromEmail,
      fromName: passwordResetSenderConfig.fromName,
      sesVerifiedDomain: passwordResetSenderConfig.sesVerifiedDomain,
    }),
    lambdaTriggers: {
      customMessage: passwordResetCustomMessageTrigger,
    },
    removalPolicy: cdk.RemovalPolicy.RETAIN,
  });
}

function addUserPoolClient(userPool: cognito.UserPool, stage: InfraStage, appType: CognitoAppType) {
  const constructPrefix = buildConstructPrefix(appType);

  return userPool.addClient(`${constructPrefix}WebClient`, {
    userPoolClientName: buildUserPoolClientName(appType, stage),
    generateSecret: false,
    disableOAuth: true,
    authFlows: {
      userPassword: true,
      userSrp: true,
    },
    preventUserExistenceErrors: true,
    supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    idTokenValidity: cdk.Duration.hours(8),
    accessTokenValidity: cdk.Duration.hours(8),
    refreshTokenValidity: cdk.Duration.days(7),
    enableTokenRevocation: true,
  });
}

function createInternalCognito(scope: Construct, props: SharedCognitoProps): InternalCognitoResources {
  const userPool = createUserPool({
    scope,
    props,
    kind: "internal",
    constructId: "SharedUserPool",
  });
  const domainPrefix = buildCognitoDomainPrefix(props, "internal");
  const userPoolDomain = userPool.addDomain("SharedUserPoolDomain", {
    cognitoDomain: {
      domainPrefix,
    },
    managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
  });

  return {
    userPool,
    userPoolDomain,
    adminUserPoolClient: addUserPoolClient(userPool, props.stage, "admin"),
    employeeUserPoolClient: addUserPoolClient(userPool, props.stage, "employee"),
    operatorUserPoolClient: addUserPoolClient(userPool, props.stage, "operator"),
    issuer: `https://cognito-idp.${cdk.Stack.of(scope).region}.amazonaws.com/${userPool.userPoolId}`,
    domainPrefix,
  };
}

function createMerchantCognito(scope: Construct, props: SharedCognitoProps): MerchantCognitoResources {
  const userPool = createUserPool({
    scope,
    props,
    kind: "merchant",
    constructId: "MerchantUserPool",
  });
  const domainPrefix = buildCognitoDomainPrefix(props, "merchant");
  const userPoolDomain = userPool.addDomain("MerchantUserPoolDomain", {
    cognitoDomain: {
      domainPrefix,
    },
    managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
  });

  return {
    userPool,
    userPoolDomain,
    merchantUserPoolClient: addUserPoolClient(userPool, props.stage, "merchant"),
    issuer: `https://cognito-idp.${cdk.Stack.of(scope).region}.amazonaws.com/${userPool.userPoolId}`,
    domainPrefix,
  };
}

export function createSharedCognito(scope: Construct, props: SharedCognitoProps): SharedCognitoResources {
  return {
    internal: createInternalCognito(scope, props),
    merchant: createMerchantCognito(scope, props),
  };
}
