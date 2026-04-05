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

const DEV_PASSWORD_RESET_FROM_EMAIL = "correcre-info@efficient-technology.com";
const DEV_PASSWORD_RESET_FROM_NAME = "コレクレ";
const DEV_PASSWORD_RESET_SES_VERIFIED_DOMAIN = "efficient-technology.com";
const DEV_PASSWORD_RESET_EMAIL_SUBJECT = "【コレクレ】パスワード再設定用コードのお知らせ";
const DEV_PASSWORD_RESET_EMAIL_HTML_PREFIX = [
  '<div style="font-family: sans-serif; line-height: 1.8; color: #111827;">',
  "<p>いつも コレクレ をご利用いただきありがとうございます。</p>",
  "<p>パスワード再設定のご依頼を受け付けました。<br />以下の確認コードを、パスワード再設定画面に入力してください。</p>",
];
const DEV_PASSWORD_RESET_EMAIL_HTML_SUFFIX = [
  "<p>※確認コードの有効期限は 60 分です。<br />※このメールにお心当たりがない場合は、本メールを破棄してください。<br />※確認コードは第三者に共有しないでください。</p>",
  "</div>",
];

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

function createDevPasswordResetCustomMessageTrigger(scope: Construct, stage: InfraStage) {
  if (stage !== "dev") {
    return undefined;
  }

  return new lambda.Function(scope, "DevPasswordResetCustomMessageTrigger", {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: "index.handler",
    description: "Customize Cognito forgot-password emails for the development environment.",
    code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  if (event.triggerSource !== "CustomMessage_ForgotPassword") {
    return event;
  }

  const codeParameter = event.request?.codeParameter ?? "{####}";
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
  const emailHtmlParts = [
    ...${JSON.stringify(DEV_PASSWORD_RESET_EMAIL_HTML_PREFIX)},
    \`<p style="margin: 24px 0; font-size: 16px; font-weight: 700;">確認コード：\${escapeHtml(codeParameter)}</p>\`,
    ...${JSON.stringify(DEV_PASSWORD_RESET_EMAIL_HTML_SUFFIX)},
  ];

  event.response = {
    ...(event.response ?? {}),
    emailSubject: ${JSON.stringify(DEV_PASSWORD_RESET_EMAIL_SUBJECT)},
    emailMessage: emailHtmlParts.join(""),
  };

  return event;
};
`),
  });
}

function createSharedUserPool(scope: Construct, props: SharedCognitoProps) {
  const devPasswordResetCustomMessageTrigger = createDevPasswordResetCustomMessageTrigger(scope, props.stage);

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
    ...(props.stage === "dev"
      ? {
          email: cognito.UserPoolEmail.withSES({
            fromEmail: DEV_PASSWORD_RESET_FROM_EMAIL,
            fromName: DEV_PASSWORD_RESET_FROM_NAME,
            sesVerifiedDomain: DEV_PASSWORD_RESET_SES_VERIFIED_DOMAIN,
          }),
          lambdaTriggers: devPasswordResetCustomMessageTrigger
            ? {
                customMessage: devPasswordResetCustomMessageTrigger,
              }
            : undefined,
        }
      : {}),
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
