import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import type { InfraStage } from "./infra-stack";

export type CognitoAppType = "admin" | "employee" | "operator";

export type SharedCognitoProps = {
  stage: InfraStage;
  account?: string;
  region?: string;
};

export type SharedCognitoResources = {
  userPool: cognito.UserPool;
  userPoolDomain: cognito.UserPoolDomain;
  adminUserPoolClient: cognito.UserPoolClient;
  employeeUserPoolClient: cognito.UserPoolClient;
  operatorUserPoolClient: cognito.UserPoolClient;
  issuer: string;
  domainPrefix: string;
};

type CustomEmailSenderConfig = {
  fromEmail: string;
  fromName: string;
  sesVerifiedDomain: string;
};

type LoginAppName = "admin" | "employee";

const DEFAULT_CUSTOM_EMAIL_SENDER_CONFIG: CustomEmailSenderConfig = {
  fromEmail: "correcre-info@efficient-technology.com",
  fromName: "コレクレ",
  sesVerifiedDomain: "efficient-technology.com",
};

// Keep production separate so only this object needs to change once the
// dedicated sender address is finalized.
const PROD_CUSTOM_EMAIL_SENDER_CONFIG: CustomEmailSenderConfig = {
  fromEmail: "correcre-info@efficient-technology.com",
  fromName: "コレクレ",
  sesVerifiedDomain: "efficient-technology.com",
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
  },
  stg: {
    admin: "https://correcre-admin-git-stage-asai001s-projects-3e71fbe6.vercel.app/login",
    employee: "https://correcre-employee-git-stage-asai001s-projects-3e71fbe6.vercel.app/login",
  },
  prod: {
    admin: "https://correcre-admin.example.com/login",
    employee: "https://correcre-employee.example.com/login",
  },
} satisfies Record<InfraStage, Record<LoginAppName, string>>;

function buildCognitoDomainPrefix(props: SharedCognitoProps): string {
  if (!props.account || !props.region) {
    throw new Error("Cognito requires account and region for multi-environment deployment.");
  }

  return ["correcre", "auth", props.stage, props.account, props.region].join("-").toLowerCase();
}

function buildUserPoolName(stage: InfraStage): string {
  return `correcre-users-${stage}`;
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
  }
}

function getCustomEmailSenderConfig(stage: InfraStage): CustomEmailSenderConfig {
  return stage === "prod" ? PROD_CUSTOM_EMAIL_SENDER_CONFIG : DEFAULT_CUSTOM_EMAIL_SENDER_CONFIG;
}

function createPasswordResetCustomMessageTrigger(scope: Construct, stage: InfraStage) {
  return new lambda.Function(scope, "PasswordResetCustomMessageTrigger", {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: "index.handler",
    description: "Customize Cognito forgot-password and admin-create-user emails.",
    code: lambda.Code.fromInline(`
const loginUrls = ${JSON.stringify(LOGIN_URLS[stage])};

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
  const rawRoles = event.request?.clientMetadata?.roles ?? "";
  const roles = parseRoles(rawRoles);
  const appName = roles.includes("EMPLOYEE") ? "employee" : "admin";
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

  const emailHtmlParts = [
    ...${JSON.stringify(PASSWORD_RESET_EMAIL_HTML_PREFIX)},
    \`<p style="margin: 24px 0; font-size: 16px; font-weight: 700;">確認コード：\${escapeHtml(codeParameter)}</p>\`,
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

function createSharedUserPool(scope: Construct, props: SharedCognitoProps) {
  const passwordResetCustomMessageTrigger = createPasswordResetCustomMessageTrigger(scope, props.stage);
  const passwordResetSenderConfig = getCustomEmailSenderConfig(props.stage);

  return new cognito.UserPool(scope, "SharedUserPool", {
    userPoolName: buildUserPoolName(props.stage),
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

export function createSharedCognito(scope: Construct, props: SharedCognitoProps): SharedCognitoResources {
  const userPool = createSharedUserPool(scope, props);
  const domainPrefix = buildCognitoDomainPrefix(props);
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
