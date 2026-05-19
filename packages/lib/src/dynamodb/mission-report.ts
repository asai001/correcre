import "server-only";

import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import type { MissionReport } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

export type MissionReportTableConfig = {
  region: string;
  tableName: string;
};

export const MISSION_REPORT_BY_COMPANY_INDEX = "MissionReportByCompanyReportedAt";
export const MISSION_REPORT_BY_COMPANY_STATUS_INDEX = "MissionReportByCompanyStatusReportedAt";

export function buildMissionReportPk(companyId: string, userId: string) {
  return `COMPANY#${companyId}#USER#${userId}` as const;
}

export function buildMissionReportByCompanyGsiPk(companyId: string) {
  return `COMPANY#${companyId}` as const;
}

export function buildMissionReportByCompanyStatusGsiPk(companyId: string, status: MissionReport["status"]) {
  return `COMPANY#${companyId}#STATUS#${status}` as const;
}

export function buildMissionReportSk(reportedAt: string, reportId: string) {
  return `REPORTED_AT#${reportedAt}#REPORT#${reportId}` as const;
}

export function buildMissionReportGsi1Sk(reportedAt: string, userId: string, reportId: string) {
  return `REPORTED_AT#${reportedAt}#USER#${userId}#REPORT#${reportId}` as const;
}

export function buildMissionReportGsi2Sk(reportedAt: string, userId: string, reportId: string) {
  return `REPORTED_AT#${reportedAt}#USER#${userId}#REPORT#${reportId}` as const;
}

export async function putMissionReport(config: MissionReportTableConfig, report: MissionReport): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  const item = {
    ...report,
    pk: buildMissionReportPk(report.companyId, report.userId),
    sk: buildMissionReportSk(report.reportedAt, report.reportId),
    gsi1pk: buildMissionReportByCompanyGsiPk(report.companyId),
    gsi1sk: buildMissionReportGsi1Sk(report.reportedAt, report.userId, report.reportId),
    gsi2pk: buildMissionReportByCompanyStatusGsiPk(report.companyId, report.status),
    gsi2sk: buildMissionReportGsi2Sk(report.reportedAt, report.userId, report.reportId),
  };

  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
    }),
  );
}

export async function listMissionReportsByCompanyAndUser(
  config: MissionReportTableConfig,
  companyId: string,
  userId: string,
): Promise<MissionReport[]> {
  const client = getDynamoDocumentClient(config.region);
  const reports: MissionReport[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": buildMissionReportPk(companyId, userId),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      reports.push(...(Items as MissionReport[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return reports;
}

export async function listMissionReportsByCompany(
  config: MissionReportTableConfig,
  companyId: string,
): Promise<MissionReport[]> {
  const client = getDynamoDocumentClient(config.region);
  const reports: MissionReport[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: MISSION_REPORT_BY_COMPANY_INDEX,
        KeyConditionExpression: "gsi1pk = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": buildMissionReportByCompanyGsiPk(companyId),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      reports.push(...(Items as MissionReport[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return reports;
}

export async function listMissionReportsByCompanyAndStatus(
  config: MissionReportTableConfig,
  companyId: string,
  status: MissionReport["status"],
): Promise<MissionReport[]> {
  const client = getDynamoDocumentClient(config.region);
  const reports: MissionReport[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        IndexName: MISSION_REPORT_BY_COMPANY_STATUS_INDEX,
        KeyConditionExpression: "gsi2pk = :gsi2pk",
        ExpressionAttributeValues: {
          ":gsi2pk": buildMissionReportByCompanyStatusGsiPk(companyId, status),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      reports.push(...(Items as MissionReport[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return reports;
}
