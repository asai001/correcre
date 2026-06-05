import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { nowYYYYMM } from "@correcre/lib";
import { getDynamoDocumentClient } from "@correcre/lib/dynamodb/client";
import { getMissionBySlot, listEnabledLatestMissionsByCompany } from "@correcre/lib/dynamodb/mission";
import {
  buildMissionReportByCompanyGsiPk,
  buildMissionReportByCompanyStatusGsiPk,
  buildMissionReportGsi1Sk,
  buildMissionReportGsi2Sk,
  buildMissionReportPk,
  buildMissionReportSk,
  listMissionReportsByCompanyAndUser,
} from "@correcre/lib/dynamodb/mission-report";
import {
  buildUserMonthlyStatsByCompanyGsiPk,
  buildUserMonthlyStatsByCompanyGsiSk,
  buildUserMonthlyStatsPk,
  buildUserMonthlyStatsSk,
  getUserMonthlyStatsByCompanyUserAndYearMonth,
} from "@correcre/lib/dynamodb/user-monthly-stats";
import { buildUserSk } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  buildFinalImageKey,
  getExtensionFromKey,
  isDraftImageKey,
  isMissionReportImageKey,
  promoteDraftImage,
} from "@correcre/lib/s3/mission-report-image";
import type { Mission, MissionImageFieldValue, MissionReport, MissionReportFieldValue } from "@correcre/types";

import { getEmployeeSession } from "@employee/lib/auth/session";
import { getEmployeeUserForSession } from "@employee/lib/auth/current-user";

type SubmitBody = {
  companyId?: unknown;
  missionId?: unknown;
  values?: unknown;
};

function isImageDraftValue(value: unknown): value is MissionImageFieldValue {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MissionImageFieldValue).s3Key === "string"
  );
}

async function findMissionForCompany(companyId: string, missionId: string): Promise<Mission | null> {
  const missionTableName = readRequiredServerEnv("DDB_MISSION_TABLE_NAME");
  const region = readRequiredServerEnv("AWS_REGION");

  for (let slotIndex = 1; slotIndex <= 5; slotIndex += 1) {
    const mission = await getMissionBySlot({ region, tableName: missionTableName }, companyId, slotIndex);
    if (mission && mission.missionId === missionId) {
      return mission;
    }
  }

  return null;
}

function toYearMonth(dateTime: string) {
  return dateTime.slice(0, 7);
}

function toCompletionRate(actualCount: number, totalCount: number) {
  if (totalCount <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((actualCount / totalCount) * 100));
}

export async function POST(req: Request) {
  const session = await getEmployeeSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await getEmployeeUserForSession(session);

  if (!user) {
    return NextResponse.json({ error: "employee_only" }, { status: 403 });
  }

  let body: SubmitBody;

  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const companyId = typeof body.companyId === "string" ? body.companyId : "";
  const missionId = typeof body.missionId === "string" ? body.missionId : "";
  const rawValues = body.values && typeof body.values === "object" ? (body.values as Record<string, unknown>) : null;

  if (!companyId || companyId !== user.companyId) {
    return NextResponse.json({ error: "company_mismatch" }, { status: 403 });
  }

  if (!missionId) {
    return NextResponse.json({ error: "missionId_required" }, { status: 400 });
  }

  if (!rawValues) {
    return NextResponse.json({ error: "values_required" }, { status: 400 });
  }

  try {
    const mission = await findMissionForCompany(companyId, missionId);

    if (!mission) {
      return NextResponse.json({ error: "mission_not_found" }, { status: 404 });
    }

    if (!mission.enabled) {
      return NextResponse.json({ error: "mission_disabled" }, { status: 400 });
    }

    const reportId = randomUUID();
    const reportedAt = new Date().toISOString();

    const region = readRequiredServerEnv("AWS_REGION");
    const bucketName = readRequiredServerEnv("S3_MISSION_REPORT_IMAGE_BUCKET_NAME");
    const missionReportTableName = readRequiredServerEnv("DDB_MISSION_REPORT_TABLE_NAME");
    const userTableName = readRequiredServerEnv("DDB_USER_TABLE_NAME");
    const userMonthlyStatsTableName = readRequiredServerEnv("DDB_USER_MONTHLY_STATS_TABLE_NAME");
    const currentYearMonth = nowYYYYMM();
    const [enabledMissions, existingReports, currentMonthStats] = await Promise.all([
      listEnabledLatestMissionsByCompany(
        {
          region,
          tableName: readRequiredServerEnv("DDB_MISSION_TABLE_NAME"),
        },
        companyId,
      ),
      listMissionReportsByCompanyAndUser(
        {
          region,
          tableName: missionReportTableName,
        },
        companyId,
        user.userId,
      ),
      getUserMonthlyStatsByCompanyUserAndYearMonth(
        {
          region,
          tableName: userMonthlyStatsTableName,
        },
        companyId,
        user.userId,
        currentYearMonth,
      ),
    ]);

    const finalizedFieldValues: Record<string, MissionReportFieldValue> = {};

    for (const field of mission.fields) {
      const incoming = rawValues[field.key];

      if (incoming === undefined || incoming === null || incoming === "") {
        if (field.required) {
          return NextResponse.json(
            { error: "required_field_missing", field: field.key },
            { status: 400 },
          );
        }
        continue;
      }

      if (field.type === "image") {
        if (!isImageDraftValue(incoming)) {
          return NextResponse.json({ error: "invalid_image_value", field: field.key }, { status: 400 });
        }

        // 自社・自分の draft 画像であることを確認
        if (!isMissionReportImageKey(incoming.s3Key, companyId, user.userId)) {
          return NextResponse.json({ error: "image_key_forbidden", field: field.key }, { status: 403 });
        }

        // draft なら mission-reports/ へ昇格、すでに昇格済みならそのまま
        let finalKey = incoming.s3Key;
        if (isDraftImageKey(incoming.s3Key)) {
          const extension = getExtensionFromKey(incoming.s3Key);
          finalKey = buildFinalImageKey({
            companyId,
            userId: user.userId,
            reportId,
            fieldKey: field.key,
            extension,
          });

          await promoteDraftImage({ region, bucketName }, { sourceKey: incoming.s3Key, destinationKey: finalKey });
        }

        finalizedFieldValues[field.key] = {
          s3Key: finalKey,
          contentType: incoming.contentType,
          originalFileName: incoming.originalFileName,
          size: incoming.size,
          uploadedAt: incoming.uploadedAt,
        } satisfies MissionImageFieldValue;
        continue;
      }

      if (typeof incoming === "string" || typeof incoming === "number" || typeof incoming === "boolean") {
        finalizedFieldValues[field.key] = incoming;
        continue;
      }

      return NextResponse.json({ error: "invalid_field_value", field: field.key }, { status: 400 });
    }

    // レビューフローは廃止。提出時点で即承認扱いとし、スコア/ポイントを確定させる。
    const report: MissionReport = {
      companyId,
      userId: user.userId,
      reportId,
      missionId,
      missionVersion: mission.version,
      missionTitleSnapshot: mission.title,
      scoreSnapshot: mission.score,
      reportedAt,
      status: "APPROVED",
      fieldValues: finalizedFieldValues,
      scoreGranted: mission.score,
      pointGranted: mission.score,
      createdAt: reportedAt,
      updatedAt: reportedAt,
    };
    const approvedReportsThisMonth = existingReports.filter(
      (item) => item.status === "APPROVED" && toYearMonth(item.reportedAt) === currentYearMonth,
    );
    const nextMissionCompletedCount = approvedReportsThisMonth.length + 1;
    const nextEarnedScore =
      approvedReportsThisMonth.reduce((sum, item) => sum + (item.scoreGranted ?? 0), 0) + mission.score;
    const nextEarnedPoints =
      approvedReportsThisMonth.reduce((sum, item) => sum + (item.pointGranted ?? 0), 0) + mission.score;
    const totalMonthlyMissionCount = enabledMissions.reduce((sum, item) => sum + item.monthlyCount, 0);
    const nextCompletionRate = toCompletionRate(nextMissionCompletedCount, totalMonthlyMissionCount);
    const earnedPointDelta = nextEarnedPoints - (currentMonthStats?.earnedPoints ?? 0);
    const nextCurrentPointBalance = (user.currentPointBalance ?? 0) + earnedPointDelta;
    const statsUpdatedAt = reportedAt;
    const client = getDynamoDocumentClient(region);

    await client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: missionReportTableName,
              Item: {
                ...report,
                pk: buildMissionReportPk(report.companyId, report.userId),
                sk: buildMissionReportSk(report.reportedAt, report.reportId),
                gsi1pk: buildMissionReportByCompanyGsiPk(report.companyId),
                gsi1sk: buildMissionReportGsi1Sk(report.reportedAt, report.userId, report.reportId),
                gsi2pk: buildMissionReportByCompanyStatusGsiPk(report.companyId, report.status),
                gsi2sk: buildMissionReportGsi2Sk(report.reportedAt, report.userId, report.reportId),
              },
            },
          },
          {
            Update: {
              TableName: userTableName,
              Key: {
                companyId,
                sk: buildUserSk(user.userId),
              },
              UpdateExpression:
                "SET currentPointBalance = :currentPointBalance, currentMonthCompletionRate = :currentMonthCompletionRate, updatedAt = :updatedAt",
              ExpressionAttributeValues: {
                ":currentPointBalance": nextCurrentPointBalance,
                ":currentMonthCompletionRate": nextCompletionRate,
                ":updatedAt": statsUpdatedAt,
              },
            },
          },
          {
            Put: {
              TableName: userMonthlyStatsTableName,
              Item: {
                pk: buildUserMonthlyStatsPk(companyId, user.userId),
                sk: buildUserMonthlyStatsSk(currentYearMonth),
                companyId,
                userId: user.userId,
                yearMonth: currentYearMonth,
                earnedPoints: nextEarnedPoints,
                usedPoints: currentMonthStats?.usedPoints ?? 0,
                earnedScore: nextEarnedScore,
                completionRate: nextCompletionRate,
                missionCompletedCount: nextMissionCompletedCount,
                updatedAt: statsUpdatedAt,
                gsi1pk: buildUserMonthlyStatsByCompanyGsiPk(companyId),
                gsi1sk: buildUserMonthlyStatsByCompanyGsiSk(currentYearMonth, user.userId),
              },
            },
          },
        ],
      }),
    );

    return NextResponse.json({
      reportId,
      reportedAt,
      status: report.status,
    });
  } catch (error) {
    console.error("POST /api/submit-mission-report error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
