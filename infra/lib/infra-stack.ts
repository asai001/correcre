import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { createSharedCognito } from "./cognito";
import { createApplicationDynamoTables } from "./dynamodb";
import { createVercelOidcAccess } from "./vercel-oidc";

export type InfraStage = "dev" | "stg" | "prod";

export interface InfraStackProps extends cdk.StackProps {
  stage: InfraStage;
  adminAppUrl: string;
  employeeAppUrl: string;
  sourceContext: string;
}

function normalizeUrl(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const adminAppUrl = normalizeUrl(props.adminAppUrl);
    const employeeAppUrl = normalizeUrl(props.employeeAppUrl);
    const sharedCognito = createSharedCognito(this, {
      stage: props.stage,
      account: props.env?.account,
      region: props.env?.region,
    });
    const dynamoTables = createApplicationDynamoTables(this, {
      stage: props.stage,
    });
    const vercelOidcAccess = createVercelOidcAccess(this, {
      stage: props.stage,
      dynamoTables,
    });

    new cdk.CfnOutput(this, "EnvironmentName", {
      value: props.stage,
    });

    new cdk.CfnOutput(this, "AdminAppUrl", {
      value: adminAppUrl,
    });

    new cdk.CfnOutput(this, "EmployeeAppUrl", {
      value: employeeAppUrl,
    });

    new cdk.CfnOutput(this, "SourceContext", {
      value: props.sourceContext,
    });

    new cdk.CfnOutput(this, "VercelTeamSlug", {
      value: vercelOidcAccess.teamSlug,
    });

    new cdk.CfnOutput(this, "VercelOidcIssuerUrl", {
      value: vercelOidcAccess.issuerUrl,
    });

    new cdk.CfnOutput(this, "VercelOidcAudience", {
      value: vercelOidcAccess.audience,
    });

    new cdk.CfnOutput(this, "VercelEnvironment", {
      value: vercelOidcAccess.vercelEnvironment,
    });

    new cdk.CfnOutput(this, "VercelProjectNames", {
      value: vercelOidcAccess.projectNames.join(","),
    });

    new cdk.CfnOutput(this, "VercelOidcProviderArn", {
      value: vercelOidcAccess.provider.openIdConnectProviderArn,
    });

    new cdk.CfnOutput(this, "VercelAwsRoleArn", {
      value: vercelOidcAccess.role.roleArn,
    });

    new cdk.CfnOutput(this, "CognitoRegion", {
      value: cdk.Stack.of(this).region,
    });

    new cdk.CfnOutput(this, "CognitoUserPoolId", {
      value: sharedCognito.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "CognitoIssuer", {
      value: sharedCognito.issuer,
    });

    new cdk.CfnOutput(this, "CognitoHostedUiBaseUrl", {
      value: sharedCognito.userPoolDomain.baseUrl(),
    });

    new cdk.CfnOutput(this, "CognitoDomainPrefix", {
      value: sharedCognito.domainPrefix,
    });

    new cdk.CfnOutput(this, "AdminCognitoRegion", {
      value: cdk.Stack.of(this).region,
    });

    new cdk.CfnOutput(this, "AdminCognitoUserPoolId", {
      value: sharedCognito.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "AdminCognitoUserPoolClientId", {
      value: sharedCognito.adminUserPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, "AdminCognitoIssuer", {
      value: sharedCognito.issuer,
    });

    new cdk.CfnOutput(this, "AdminCognitoHostedUiBaseUrl", {
      value: sharedCognito.userPoolDomain.baseUrl(),
    });

    new cdk.CfnOutput(this, "AdminCognitoDomainPrefix", {
      value: sharedCognito.domainPrefix,
    });

    new cdk.CfnOutput(this, "EmployeeCognitoRegion", {
      value: cdk.Stack.of(this).region,
    });

    new cdk.CfnOutput(this, "EmployeeCognitoUserPoolId", {
      value: sharedCognito.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "EmployeeCognitoUserPoolClientId", {
      value: sharedCognito.employeeUserPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, "EmployeeCognitoIssuer", {
      value: sharedCognito.issuer,
    });

    new cdk.CfnOutput(this, "EmployeeCognitoHostedUiBaseUrl", {
      value: sharedCognito.userPoolDomain.baseUrl(),
    });

    new cdk.CfnOutput(this, "EmployeeCognitoDomainPrefix", {
      value: sharedCognito.domainPrefix,
    });

    new cdk.CfnOutput(this, "CompanyTableName", {
      value: dynamoTables.companyTable.tableName,
    });

    new cdk.CfnOutput(this, "UserTableName", {
      value: dynamoTables.userTable.tableName,
    });

    new cdk.CfnOutput(this, "DepartmentTableName", {
      value: dynamoTables.departmentTable.tableName,
    });

    new cdk.CfnOutput(this, "MissionTableName", {
      value: dynamoTables.missionTable.tableName,
    });

    new cdk.CfnOutput(this, "MissionReportTableName", {
      value: dynamoTables.missionReportTable.tableName,
    });

    new cdk.CfnOutput(this, "UserMonthlyStatsTableName", {
      value: dynamoTables.userMonthlyStatsTable.tableName,
    });

    new cdk.CfnOutput(this, "ExchangeHistoryTableName", {
      value: dynamoTables.exchangeHistoryTable.tableName,
    });

    new cdk.CfnOutput(this, "PointTransactionTableName", {
      value: dynamoTables.pointTransactionTable.tableName,
    });
  }
}
