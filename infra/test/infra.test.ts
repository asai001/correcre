import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";

import { InfraStack, type InfraStage } from "../lib/infra-stack";

function createStack(stage: InfraStage): InfraStack {
  const app = new cdk.App();

  return new InfraStack(app, `Correcre${stage}TestStack`, {
    env: {
      account: "123456789012",
      region: "ap-northeast-1",
    },
    stage,
    adminAppUrl: "https://admin.example.com/",
    employeeAppUrl: "https://employee.example.com/",
    sourceBranch: "test",
  });
}

function getSingleTableResource(template: Template, tableName: string): Record<string, unknown> {
  const resources = template.findResources("AWS::DynamoDB::Table", {
    Properties: {
      TableName: tableName,
    },
  });
  const matchedResources = Object.values(resources);

  expect(matchedResources).toHaveLength(1);

  return matchedResources[0] as Record<string, unknown>;
}

describe("InfraStack", () => {
  test("provisions the requested multi-table DynamoDB design", () => {
    const template = Template.fromStack(createStack("dev"));
    const devUserTable = getSingleTableResource(template, "correcre-user-dev");

    template.resourceCountIs("AWS::DynamoDB::Table", 8);

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-user-dev",
        BillingMode: "PAY_PER_REQUEST",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "companyId",
            KeyType: "HASH",
          }),
          Match.objectLike({
            AttributeName: "sk",
            KeyType: "RANGE",
          }),
        ]),
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: "UserByCognitoSub",
          }),
          Match.objectLike({
            IndexName: "UserByEmail",
          }),
          Match.objectLike({
            IndexName: "UserByDepartment",
          }),
        ]),
      }),
    );

    expect(
      (devUserTable.Properties as { PointInTimeRecoverySpecification?: unknown }).PointInTimeRecoverySpecification,
    ).toBeUndefined();
    expect(devUserTable.DeletionPolicy).toBe("Delete");
    expect(devUserTable.UpdateReplacePolicy).toBe("Delete");

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-mission-report-dev",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "pk",
            KeyType: "HASH",
          }),
          Match.objectLike({
            AttributeName: "sk",
            KeyType: "RANGE",
          }),
        ]),
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: "MissionReportByCompanyReportedAt",
          }),
          Match.objectLike({
            IndexName: "MissionReportByCompanyStatusReportedAt",
          }),
        ]),
        SSESpecification: {
          SSEEnabled: true,
        },
      }),
    );

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-point-transaction-dev",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "pk",
            KeyType: "HASH",
          }),
          Match.objectLike({
            AttributeName: "sk",
            KeyType: "RANGE",
          }),
        ]),
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: "PointTransactionByCompanyOccurredAt",
          }),
        ]),
      }),
    );
  });

  test("uses retain and point-in-time recovery only in production", () => {
    const template = Template.fromStack(createStack("prod"));
    const prodCompanyTable = getSingleTableResource(template, "correcre-company-prod");

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-company-prod",
        DeletionProtectionEnabled: true,
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
          RecoveryPeriodInDays: 35,
        },
      }),
    );

    expect(prodCompanyTable.DeletionPolicy).toBe("Retain");
    expect(prodCompanyTable.UpdateReplacePolicy).toBe("Retain");
  });

  test("uses destroy semantics outside production", () => {
    const template = Template.fromStack(createStack("stg"));
    const stgCompanyTable = getSingleTableResource(template, "correcre-company-stg");

    expect(stgCompanyTable.DeletionPolicy).toBe("Delete");
    expect(stgCompanyTable.UpdateReplacePolicy).toBe("Delete");
    expect(
      (stgCompanyTable.Properties as { PointInTimeRecoverySpecification?: unknown }).PointInTimeRecoverySpecification,
    ).toBeUndefined();
  });

  test("configures Cognito with 8+ character passwords and no required character classes", () => {
    const template = Template.fromStack(createStack("dev"));

    template.hasResourceProperties(
      "AWS::Cognito::UserPool",
      Match.objectLike({
        Policies: {
          PasswordPolicy: Match.objectLike({
            MinimumLength: 8,
            RequireLowercase: false,
            RequireNumbers: false,
            RequireSymbols: false,
            RequireUppercase: false,
            TemporaryPasswordValidityDays: 7,
          }),
        },
      }),
    );
  });
});
