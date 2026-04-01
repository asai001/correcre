import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

import type { InfraStage } from "./infra-stack";

export type CognitoAppType = "admin" | "employee";

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
  issuer: string;
  domainPrefix: string;
};

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
  return appType === "admin" ? "Admin" : "Employee";
}

function createSharedUserPool(scope: Construct, props: SharedCognitoProps) {
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
      // the "半角英数字8文字以上" rule before submitting NEW_PASSWORD_REQUIRED.
      minLength: 8,
      requireDigits: false,
      requireLowercase: false,
      requireUppercase: false,
      requireSymbols: false,
      tempPasswordValidity: cdk.Duration.days(7),
    },
    accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
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
    issuer: `https://cognito-idp.${cdk.Stack.of(scope).region}.amazonaws.com/${userPool.userPoolId}`,
    domainPrefix,
  };
}
