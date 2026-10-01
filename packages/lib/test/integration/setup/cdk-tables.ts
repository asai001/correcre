import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";

import { InfraStack, type InfraStage } from "../../../../../infra/lib/infra-stack";

// 統合テストで使うステージ。テーブル名は correcre-<base>-<stage>。
export const TEST_STAGE: InfraStage = "dev";
export const TEST_REGION = "ap-northeast-1";

export function testTableName(baseName: string): string {
  return `correcre-${baseName}-${TEST_STAGE}`;
}

type CloudFormationKeySchema = { AttributeName: string; KeyType: "HASH" | "RANGE" }[];

type CloudFormationTableProperties = {
  TableName: string;
  KeySchema: CloudFormationKeySchema;
  AttributeDefinitions: { AttributeName: string; AttributeType: "S" | "N" | "B" }[];
  GlobalSecondaryIndexes?: {
    IndexName: string;
    KeySchema: CloudFormationKeySchema;
    Projection: { ProjectionType: "ALL" | "KEYS_ONLY" | "INCLUDE"; NonKeyAttributes?: string[] };
  }[];
};

export type SynthesizedTable = {
  logicalId: string;
  properties: CloudFormationTableProperties;
};

let cachedTables: SynthesizedTable[] | undefined;

// infra/lib の CDK スタックを合成し、DynamoDB テーブル定義だけを取り出す。
// 本番へデプロイされるものと同じ定義からテスト用テーブルを作るのが目的。
export function synthesizeDynamoTables(stage: InfraStage = TEST_STAGE): SynthesizedTable[] {
  if (cachedTables && stage === TEST_STAGE) {
    return cachedTables;
  }

  const app = new cdk.App();
  const stack = new InfraStack(app, `Correcre${stage}IntegrationTestStack`, {
    env: { account: "123456789012", region: TEST_REGION },
    stage,
    adminAppUrl: "https://admin.example.com/",
    employeeAppUrl: "https://employee.example.com/",
    sourceContext: "integration-test",
  });
  const resources = Template.fromStack(stack).findResources("AWS::DynamoDB::Table");

  const tables = Object.entries(resources).map(([logicalId, resource]) => ({
    logicalId,
    properties: (resource as { Properties: CloudFormationTableProperties }).Properties,
  }));

  if (stage === TEST_STAGE) {
    cachedTables = tables;
  }

  return tables;
}

export function findSynthesizedTable(baseName: string): SynthesizedTable {
  const tableName = testTableName(baseName);
  const table = synthesizeDynamoTables().find((candidate) => candidate.properties.TableName === tableName);

  if (!table) {
    throw new Error(`CDK stack does not define a table named ${tableName}`);
  }

  return table;
}

// CloudFormation の Properties を CreateTable API の入力へ変換する。
// キー・属性定義・GSI の形は CloudFormation と SDK でほぼ同じなので、必要な項目だけ写し取る。
// 課金モードは DynamoDB Local でも受理される PAY_PER_REQUEST に固定する。
export function toCreateTableInput(table: SynthesizedTable): CreateTableCommandInput {
  const { TableName, KeySchema, AttributeDefinitions, GlobalSecondaryIndexes } = table.properties;

  return {
    TableName,
    KeySchema,
    AttributeDefinitions,
    BillingMode: "PAY_PER_REQUEST",
    ...(GlobalSecondaryIndexes?.length
      ? {
          GlobalSecondaryIndexes: GlobalSecondaryIndexes.map((gsi) => ({
            IndexName: gsi.IndexName,
            KeySchema: gsi.KeySchema,
            Projection: gsi.Projection,
          })),
        }
      : {}),
  };
}
