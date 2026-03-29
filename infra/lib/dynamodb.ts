import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

import type { InfraStage } from "./infra-stack";

export interface ApplicationDynamoTablesProps {
  stage: InfraStage;
}

export interface ApplicationDynamoTables {
  companyTable: dynamodb.Table;
  userTable: dynamodb.Table;
  departmentTable: dynamodb.Table;
  missionTable: dynamodb.Table;
  missionReportTable: dynamodb.Table;
  userMonthlyStatsTable: dynamodb.Table;
  exchangeHistoryTable: dynamodb.Table;
  pointTransactionTable: dynamodb.Table;
}

// Key naming policy:
// - Snapshot/master tables that are always scoped by company keep `companyId` as the
//   partition key because that matches the domain model and existing app-side types.
// - Event/read-model tables use generic `pk` / `sk` because their keys are composite
//   strings such as `COMPANY#...#USER#...`, and the attribute name should not imply
//   a raw company id.
// - If we want to fully unify naming later, the cleanest alternative is to move every
//   table to `pk` / `sk`, but this change keeps `companyId` on company-scoped masters
//   for readability and easier migration from the current codebase.

function stringAttribute(name: string): dynamodb.Attribute {
  return {
    name,
    type: dynamodb.AttributeType.STRING,
  };
}

function buildTableName(baseName: string, stage: InfraStage): string {
  return `correcre-${baseName}-${stage}`;
}

function isProductionStage(stage: InfraStage): boolean {
  return stage === "prod";
}

function resolveRemovalPolicy(stage: InfraStage): cdk.RemovalPolicy {
  return isProductionStage(stage) ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
}

function resolvePointInTimeRecovery(stage: InfraStage): dynamodb.PointInTimeRecoverySpecification | undefined {
  if (!isProductionStage(stage)) {
    return undefined;
  }

  return {
    pointInTimeRecoveryEnabled: true,
    recoveryPeriodInDays: 35,
  };
}

function buildTableProps(
  stage: InfraStage,
  tableName: string,
  partitionKeyName: string,
  sortKeyName?: string,
): dynamodb.TableProps {
  return {
    tableName,
    partitionKey: stringAttribute(partitionKeyName),
    sortKey: sortKeyName ? stringAttribute(sortKeyName) : undefined,
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    pointInTimeRecoverySpecification: resolvePointInTimeRecovery(stage),
    contributorInsightsSpecification: {
      enabled: isProductionStage(stage),
    },
    encryption: dynamodb.TableEncryption.AWS_MANAGED,
    removalPolicy: resolveRemovalPolicy(stage),
    deletionProtection: isProductionStage(stage),
  };
}

// Company
// - companyId = <companyId>
// - no sort key
// - no GSIs in this stack
function createCompanyTable(scope: Construct, stage: InfraStage): dynamodb.Table {
  return new dynamodb.Table(scope, "CompanyTable", buildTableProps(stage, buildTableName("company", stage), "companyId"));
}

// User
// - companyId = <companyId>
// - sk = USER#<userId>
// - gsi1pk = COGNITO_SUB#<cognitoSub>
// - gsi2pk = EMAIL#<email>
// - gsi3pk = COMPANY#<companyId>#DEPT#<departmentId>
// - gsi3sk = USER#<userId>
function createUserTable(scope: Construct, stage: InfraStage): dynamodb.Table {
  const table = new dynamodb.Table(scope, "UserTable", buildTableProps(stage, buildTableName("user", stage), "companyId", "sk"));

  table.addGlobalSecondaryIndex({
    indexName: "UserByCognitoSub",
    partitionKey: stringAttribute("gsi1pk"),
  });

  table.addGlobalSecondaryIndex({
    indexName: "UserByEmail",
    partitionKey: stringAttribute("gsi2pk"),
  });

  table.addGlobalSecondaryIndex({
    indexName: "UserByDepartment",
    partitionKey: stringAttribute("gsi3pk"),
    sortKey: stringAttribute("gsi3sk"),
  });

  return table;
}

// Department
// - companyId = <companyId>
// - sk = DEPT#<departmentId>
// - no GSIs in this stack
function createDepartmentTable(scope: Construct, stage: InfraStage): dynamodb.Table {
  return new dynamodb.Table(scope, "DepartmentTable", buildTableProps(stage, buildTableName("department", stage), "companyId", "sk"));
}

// Mission
// - companyId = <companyId>
// - sk = MISSION#<missionId>#VER#<version>
// - gsi1pk = COMPANY#<companyId>
// - gsi1sk = ENABLED#<0|1>#ORDER#<order>#MISSION#<missionId>#VER#<version>
function createMissionTable(scope: Construct, stage: InfraStage): dynamodb.Table {
  const table = new dynamodb.Table(scope, "MissionTable", buildTableProps(stage, buildTableName("mission", stage), "companyId", "sk"));

  table.addGlobalSecondaryIndex({
    indexName: "MissionByCompanyAndEnabledOrder",
    partitionKey: stringAttribute("gsi1pk"),
    sortKey: stringAttribute("gsi1sk"),
  });

  return table;
}

// MissionReport
// - pk = COMPANY#<companyId>#USER#<userId>
// - sk = REPORTED_AT#<ISO8601>#REPORT#<reportId>
// - gsi1pk = COMPANY#<companyId>
// - gsi1sk = REPORTED_AT#<ISO8601>#USER#<userId>#REPORT#<reportId>
// - gsi2pk = COMPANY#<companyId>#STATUS#<status>
// - gsi2sk = REPORTED_AT#<ISO8601>#USER#<userId>#REPORT#<reportId>
function createMissionReportTable(scope: Construct, stage: InfraStage): dynamodb.Table {
  const table = new dynamodb.Table(
    scope,
    "MissionReportTable",
    buildTableProps(stage, buildTableName("mission-report", stage), "pk", "sk"),
  );

  table.addGlobalSecondaryIndex({
    indexName: "MissionReportByCompanyReportedAt",
    partitionKey: stringAttribute("gsi1pk"),
    sortKey: stringAttribute("gsi1sk"),
  });

  table.addGlobalSecondaryIndex({
    indexName: "MissionReportByCompanyStatusReportedAt",
    partitionKey: stringAttribute("gsi2pk"),
    sortKey: stringAttribute("gsi2sk"),
  });

  return table;
}

// UserMonthlyStats
// - pk = COMPANY#<companyId>#USER#<userId>
// - sk = YM#<YYYY-MM>
// - gsi1pk = COMPANY#<companyId>
// - gsi1sk = YM#<YYYY-MM>#USER#<userId>
function createUserMonthlyStatsTable(scope: Construct, stage: InfraStage): dynamodb.Table {
  const table = new dynamodb.Table(
    scope,
    "UserMonthlyStatsTable",
    buildTableProps(stage, buildTableName("user-monthly-stats", stage), "pk", "sk"),
  );

  table.addGlobalSecondaryIndex({
    indexName: "UserMonthlyStatsByCompanyYearMonth",
    partitionKey: stringAttribute("gsi1pk"),
    sortKey: stringAttribute("gsi1sk"),
  });

  return table;
}

// ExchangeHistory
// - pk = COMPANY#<companyId>#USER#<userId>
// - sk = EXCHANGED_AT#<ISO8601>#EXCHANGE#<exchangeId>
// - gsi1pk = COMPANY#<companyId>
// - gsi1sk = EXCHANGED_AT#<ISO8601>#USER#<userId>#EXCHANGE#<exchangeId>
function createExchangeHistoryTable(scope: Construct, stage: InfraStage): dynamodb.Table {
  const table = new dynamodb.Table(
    scope,
    "ExchangeHistoryTable",
    buildTableProps(stage, buildTableName("exchange-history", stage), "pk", "sk"),
  );

  table.addGlobalSecondaryIndex({
    indexName: "ExchangeHistoryByCompanyExchangedAt",
    partitionKey: stringAttribute("gsi1pk"),
    sortKey: stringAttribute("gsi1sk"),
  });

  return table;
}

// PointTransaction is the source of truth for point history, so a company-wide
// chronological GSI is worth having for audit and backoffice review.
// - pk = COMPANY#<companyId>#USER#<userId>
// - sk = OCCURRED_AT#<ISO8601>#TX#<transactionId>
// - gsi1pk = COMPANY#<companyId>
// - gsi1sk = OCCURRED_AT#<ISO8601>#USER#<userId>#TX#<transactionId>
function createPointTransactionTable(scope: Construct, stage: InfraStage): dynamodb.Table {
  const table = new dynamodb.Table(
    scope,
    "PointTransactionTable",
    buildTableProps(stage, buildTableName("point-transaction", stage), "pk", "sk"),
  );

  table.addGlobalSecondaryIndex({
    indexName: "PointTransactionByCompanyOccurredAt",
    partitionKey: stringAttribute("gsi1pk"),
    sortKey: stringAttribute("gsi1sk"),
  });

  return table;
}

export function createApplicationDynamoTables(
  scope: Construct,
  props: ApplicationDynamoTablesProps,
): ApplicationDynamoTables {
  return {
    companyTable: createCompanyTable(scope, props.stage),
    userTable: createUserTable(scope, props.stage),
    departmentTable: createDepartmentTable(scope, props.stage),
    missionTable: createMissionTable(scope, props.stage),
    missionReportTable: createMissionReportTable(scope, props.stage),
    userMonthlyStatsTable: createUserMonthlyStatsTable(scope, props.stage),
    exchangeHistoryTable: createExchangeHistoryTable(scope, props.stage),
    pointTransactionTable: createPointTransactionTable(scope, props.stage),
  };
}
