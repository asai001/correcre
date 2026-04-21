import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import type { ApplicationDynamoTables } from "./dynamodb";
import type { InfraStage } from "./infra-stack";

const VERCEL_TEAM_SLUG = "asai001s-projects-3e71fbe6";
const VERCEL_PROJECT_NAMES = ["correcre-admin", "correcre-employee", "correcre-operator"] as const;

type VercelEnvironment = "development" | "preview" | "production";

export interface VercelOidcAccessProps {
  stage: InfraStage;
  dynamoTables: ApplicationDynamoTables;
  cognitoUserPoolArn: string;
}

export interface VercelOidcAccess {
  provider: iam.OpenIdConnectProvider;
  role: iam.Role;
  audience: string;
  issuerUrl: string;
  projectNames: readonly string[];
  teamSlug: string;
  vercelEnvironment: VercelEnvironment;
}

function getVercelEnvironment(stage: InfraStage): VercelEnvironment {
  switch (stage) {
    case "dev":
      return "development";
    case "stg":
      return "preview";
    case "prod":
      return "production";
    default: {
      const exhaustiveStage: never = stage;
      throw new Error(`Unsupported stage for Vercel OIDC mapping: ${exhaustiveStage}`);
    }
  }
}

function getIssuerHost(teamSlug: string): string {
  return `oidc.vercel.com/${teamSlug}`;
}

function getAudience(teamSlug: string): string {
  return `https://vercel.com/${teamSlug}`;
}

function getIssuerUrl(teamSlug: string): string {
  return `https://${getIssuerHost(teamSlug)}`;
}

function getSubjectPatterns(teamSlug: string, vercelEnvironment: VercelEnvironment) {
  return VERCEL_PROJECT_NAMES.map(
    (projectName) => `owner:${teamSlug}:project:${projectName}:environment:${vercelEnvironment}`,
  );
}

function getApplicationTables(dynamoTables: ApplicationDynamoTables) {
  return [
    dynamoTables.companyTable,
    dynamoTables.userTable,
    dynamoTables.departmentTable,
    dynamoTables.missionTable,
    dynamoTables.missionHistoryTable,
    dynamoTables.missionReportTable,
    dynamoTables.userMonthlyStatsTable,
    dynamoTables.exchangeHistoryTable,
    dynamoTables.pointTransactionTable,
  ];
}

export function createVercelOidcAccess(scope: Construct, props: VercelOidcAccessProps): VercelOidcAccess {
  const vercelEnvironment = getVercelEnvironment(props.stage);
  const issuerHost = getIssuerHost(VERCEL_TEAM_SLUG);
  const issuerUrl = getIssuerUrl(VERCEL_TEAM_SLUG);
  const audience = getAudience(VERCEL_TEAM_SLUG);

  const provider = new iam.OpenIdConnectProvider(scope, "VercelOidcProvider", {
    url: issuerUrl,
    clientIds: [audience],
  });

  const role = new iam.Role(scope, "VercelDynamoDbRole", {
    roleName: `correcre-vercel-dynamodb-${props.stage}`,
    description: `Vercel OIDC role for Correcre ${props.stage} applications`,
    assumedBy: new iam.OpenIdConnectPrincipal(provider, {
      StringEquals: {
        [`${issuerHost}:aud`]: audience,
      },
      StringLike: {
        [`${issuerHost}:sub`]: getSubjectPatterns(VERCEL_TEAM_SLUG, vercelEnvironment),
      },
    }),
  });

  for (const table of getApplicationTables(props.dynamoTables)) {
    table.grantReadWriteData(role);
  }

  role.addToPolicy(
    new iam.PolicyStatement({
      actions: ["cognito-idp:AdminCreateUser", "cognito-idp:AdminDeleteUser"],
      resources: [props.cognitoUserPoolArn],
    }),
  );

  return {
    provider,
    role,
    audience,
    issuerUrl,
    projectNames: VERCEL_PROJECT_NAMES,
    teamSlug: VERCEL_TEAM_SLUG,
    vercelEnvironment,
  };
}
