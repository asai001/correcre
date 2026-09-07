import { describe, expect, test } from "vitest";

import {
  EXCHANGE_HISTORY_BY_COMPANY_INDEX,
  EXCHANGE_HISTORY_BY_MERCHANT_INDEX,
  EXCHANGE_HISTORY_BY_MERCHANT_STATUS_INDEX,
} from "../../src/dynamodb/exchange-history";
import { MERCHANDISE_BY_STATUS_INDEX } from "../../src/dynamodb/merchandise";
import { MERCHANT_USER_BY_COGNITO_SUB_INDEX, MERCHANT_USER_BY_EMAIL_INDEX } from "../../src/dynamodb/merchant-user";
import { MISSION_REPORT_BY_COMPANY_INDEX, MISSION_REPORT_BY_COMPANY_STATUS_INDEX } from "../../src/dynamodb/mission-report";
import { SESSION_BY_COGNITO_SUB_INDEX } from "../../src/dynamodb/session";
import {
  SUPPORT_INQUIRY_BY_CREATED_AT_INDEX,
  SUPPORT_INQUIRY_BY_STATUS_CREATED_AT_INDEX,
} from "../../src/dynamodb/support-inquiry";
import { USER_BY_COGNITO_SUB_INDEX, USER_BY_DEPARTMENT_INDEX, USER_BY_EMAIL_INDEX } from "../../src/dynamodb/user";
import { USER_MONTHLY_STATS_BY_COMPANY_INDEX } from "../../src/dynamodb/user-monthly-stats";
import { findSynthesizedTable, synthesizeDynamoTables } from "./setup/cdk-tables";

// lib（アプリ側の実装）が前提にしているテーブル契約と、infra（CDK）が実際に作るテーブルの照合。
// GSI 名や PK/SK の属性名がズレると、デプロイ後に Query が ValidationException で落ちる。
// このテストは DynamoDB Local を使わず、CDK 合成結果だけで判定する。

type IndexExpectation = {
  table: string;
  indexName: string;
  partitionKey: string;
  sortKey?: string;
};

const INDEX_EXPECTATIONS: IndexExpectation[] = [
  { table: "user", indexName: USER_BY_COGNITO_SUB_INDEX, partitionKey: "gsi1pk" },
  { table: "user", indexName: USER_BY_EMAIL_INDEX, partitionKey: "gsi2pk" },
  { table: "user", indexName: USER_BY_DEPARTMENT_INDEX, partitionKey: "gsi3pk", sortKey: "gsi3sk" },
  { table: "exchange-history", indexName: EXCHANGE_HISTORY_BY_COMPANY_INDEX, partitionKey: "gsi1pk", sortKey: "gsi1sk" },
  {
    table: "exchange-history",
    indexName: EXCHANGE_HISTORY_BY_MERCHANT_STATUS_INDEX,
    partitionKey: "gsi2pk",
    sortKey: "gsi2sk",
  },
  { table: "exchange-history", indexName: EXCHANGE_HISTORY_BY_MERCHANT_INDEX, partitionKey: "gsi3pk", sortKey: "gsi3sk" },
  { table: "mission-report", indexName: MISSION_REPORT_BY_COMPANY_INDEX, partitionKey: "gsi1pk", sortKey: "gsi1sk" },
  { table: "mission-report", indexName: MISSION_REPORT_BY_COMPANY_STATUS_INDEX, partitionKey: "gsi2pk", sortKey: "gsi2sk" },
  { table: "user-monthly-stats", indexName: USER_MONTHLY_STATS_BY_COMPANY_INDEX, partitionKey: "gsi1pk", sortKey: "gsi1sk" },
  { table: "merchant-user", indexName: MERCHANT_USER_BY_COGNITO_SUB_INDEX, partitionKey: "gsi1pk" },
  { table: "merchant-user", indexName: MERCHANT_USER_BY_EMAIL_INDEX, partitionKey: "gsi2pk" },
  { table: "merchandise", indexName: MERCHANDISE_BY_STATUS_INDEX, partitionKey: "gsi1pk", sortKey: "gsi1sk" },
  { table: "session", indexName: SESSION_BY_COGNITO_SUB_INDEX, partitionKey: "gsi1pk", sortKey: "gsi1sk" },
  { table: "support-inquiry", indexName: SUPPORT_INQUIRY_BY_CREATED_AT_INDEX, partitionKey: "gsi1pk", sortKey: "gsi1sk" },
  {
    table: "support-inquiry",
    indexName: SUPPORT_INQUIRY_BY_STATUS_CREATED_AT_INDEX,
    partitionKey: "gsi2pk",
    sortKey: "gsi2sk",
  },
];

// lib のキービルダーが前提にしているテーブルキー（属性名）。
const KEY_EXPECTATIONS: { table: string; partitionKey: string; sortKey?: string }[] = [
  { table: "company", partitionKey: "companyId" },
  { table: "user", partitionKey: "companyId", sortKey: "sk" },
  { table: "department", partitionKey: "companyId", sortKey: "sk" },
  { table: "mission", partitionKey: "companyId", sortKey: "sk" },
  { table: "mission-history", partitionKey: "pk", sortKey: "sk" },
  { table: "mission-report", partitionKey: "pk", sortKey: "sk" },
  { table: "user-monthly-stats", partitionKey: "pk", sortKey: "sk" },
  { table: "exchange-history", partitionKey: "pk", sortKey: "sk" },
  { table: "point-transaction", partitionKey: "pk", sortKey: "sk" },
  { table: "merchant", partitionKey: "merchantId" },
  { table: "merchant-user", partitionKey: "merchantId", sortKey: "sk" },
  { table: "merchandise", partitionKey: "merchantId", sortKey: "sk" },
  { table: "exchange-favorite", partitionKey: "pk", sortKey: "sk" },
  { table: "operator-audit-log", partitionKey: "pk", sortKey: "sk" },
  { table: "session", partitionKey: "pk" },
  { table: "system-setting", partitionKey: "settingKey" },
  { table: "support-inquiry", partitionKey: "pk" },
  { table: "seminar-registration", partitionKey: "pk", sortKey: "sk" },
];

function keyAttribute(keySchema: { AttributeName: string; KeyType: string }[], keyType: "HASH" | "RANGE") {
  return keySchema.find((key) => key.KeyType === keyType)?.AttributeName;
}

describe("CDK と lib のテーブル契約", () => {
  test("CDK スタックは lib が参照する 18 テーブルをすべて定義している", () => {
    const defined = synthesizeDynamoTables().map((table) => table.properties.TableName);

    expect(defined).toHaveLength(KEY_EXPECTATIONS.length);
    for (const expectation of KEY_EXPECTATIONS) {
      expect(defined).toContain(`correcre-${expectation.table}-dev`);
    }
  });

  test.each(KEY_EXPECTATIONS)("$table テーブルのキー属性名が lib のキービルダーと一致する", (expectation) => {
    const { KeySchema } = findSynthesizedTable(expectation.table).properties;

    expect(keyAttribute(KeySchema, "HASH")).toBe(expectation.partitionKey);
    expect(keyAttribute(KeySchema, "RANGE")).toBe(expectation.sortKey);
  });

  test.each(INDEX_EXPECTATIONS)(
    "$table テーブルに lib が Query する GSI $indexName が定義されている",
    (expectation) => {
      const { GlobalSecondaryIndexes = [] } = findSynthesizedTable(expectation.table).properties;
      const index = GlobalSecondaryIndexes.find((gsi) => gsi.IndexName === expectation.indexName);

      expect(index, `GSI ${expectation.indexName} が CDK に無い`).toBeDefined();
      expect(keyAttribute(index!.KeySchema, "HASH")).toBe(expectation.partitionKey);
      expect(keyAttribute(index!.KeySchema, "RANGE")).toBe(expectation.sortKey);
      // lib はインデックスから全属性を読む前提なので、射影は ALL でなければならない。
      expect(index!.Projection.ProjectionType).toBe("ALL");
    },
  );
});
