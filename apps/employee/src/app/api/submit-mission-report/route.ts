import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { calculateMissionRewardPoint, nowYYYYMM, reflectMission, reflectPoints } from "@correcre/lib";
import { getDynamoDocumentClient } from "@correcre/lib/dynamodb/client";
import { getCompanyById } from "@correcre/lib/dynamodb/company";
import {
  getMissionBySlot,
  listEnabledLatestMissionsByCompany,
  promoteScheduledMissionIfDue,
} from "@correcre/lib/dynamodb/mission";
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
import { createPointTransaction, createPointTransactionPutTransactItem } from "@correcre/lib/dynamodb/point-transaction";
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

function isTransactionConditionalCheckFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const e = error as { name?: string; CancellationReasons?: Array<{ Code?: string }> };

  if (e.name === "ConditionalCheckFailedException") {
    return true;
  }

  if (e.name === "TransactionCanceledException" && Array.isArray(e.CancellationReasons)) {
    return e.CancellationReasons.some((reason) => reason?.Code === "ConditionalCheckFailed");
  }

  return false;
}

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
      // 「翌月月初から反映」予約が反映予定月に達していれば、この提出機会に昇格して永続化する。
      // 以降のスナップショット（version/title/score/fields/enabled）は昇格後の内容を使う。
      if (reflectMission(mission).changed) {
        const missionHistoryTableName = readRequiredServerEnv("DDB_MISSION_HISTORY_TABLE_NAME");
        const promoted = await promoteScheduledMissionIfDue(
          { region, missionTableName, missionHistoryTableName },
          companyId,
          slotIndex,
        );
        return promoted ?? mission;
      }
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

function isMissingFieldValue(value: unknown) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function isValidOptionValue(value: string, options?: string[]) {
  return !options?.length || options.includes(value);
}

function buildFieldValidationError(error: string, fieldKey: string, message: string) {
  return NextResponse.json({ error, field: fieldKey, message }, { status: 400 });
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
    const companyTableName = readRequiredServerEnv("DDB_COMPANY_TABLE_NAME");
    const missionReportTableName = readRequiredServerEnv("DDB_MISSION_REPORT_TABLE_NAME");
    const pointTransactionTableName = readRequiredServerEnv("DDB_POINT_TRANSACTION_TABLE_NAME");
    const userTableName = readRequiredServerEnv("DDB_USER_TABLE_NAME");
    const userMonthlyStatsTableName = readRequiredServerEnv("DDB_USER_MONTHLY_STATS_TABLE_NAME");
    const currentYearMonth = nowYYYYMM();
    const [company, enabledMissions, existingReports, currentMonthStats] = await Promise.all([
      getCompanyById(
        {
          region,
          tableName: companyTableName,
        },
        companyId,
      ),
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

    if (!company) {
      return NextResponse.json({ error: "company_not_found" }, { status: 404 });
    }

    const finalizedFieldValues: Record<string, MissionReportFieldValue> = {};

    for (const field of mission.fields) {
      const incoming = rawValues[field.key];

      if (isMissingFieldValue(incoming)) {
        if (field.required) {
          return NextResponse.json(
            { error: "required_field_missing", field: field.key },
            { status: 400 },
          );
        }
        continue;
      }

      if (field.type === "text" || field.type === "textarea") {
        if (typeof incoming !== "string") {
          return NextResponse.json({ error: "invalid_text_value", field: field.key }, { status: 400 });
        }

        if (field.minLength !== undefined && incoming.length < field.minLength) {
          return buildFieldValidationError(
            "field_too_short",
            field.key,
            `「${field.label}」の文字数が不正です。${field.minLength}文字以上で入力してください（現在${incoming.length}文字）。`,
          );
        }

        if (field.maxLength !== undefined && incoming.length > field.maxLength) {
          return buildFieldValidationError(
            "field_too_long",
            field.key,
            `「${field.label}」の文字数が不正です。${field.maxLength}文字以内で入力してください（現在${incoming.length}文字）。`,
          );
        }

        finalizedFieldValues[field.key] = incoming;
        continue;
      }

      if (field.type === "select") {
        if (typeof incoming !== "string" || !isValidOptionValue(incoming, field.options)) {
          return NextResponse.json({ error: "invalid_select_value", field: field.key }, { status: 400 });
        }

        finalizedFieldValues[field.key] = incoming;
        continue;
      }

      if (field.type === "multiSelect") {
        if (
          !Array.isArray(incoming) ||
          incoming.some((value) => typeof value !== "string" || !isValidOptionValue(value, field.options))
        ) {
          return NextResponse.json({ error: "invalid_multi_select_value", field: field.key }, { status: 400 });
        }

        const selectedValues = incoming as string[];

        if (field.minSelected !== undefined && selectedValues.length < field.minSelected) {
          return buildFieldValidationError(
            "too_few_selected",
            field.key,
            `「${field.label}」の選択数が不正です。${field.minSelected}個以上選択してください（現在${selectedValues.length}個）。`,
          );
        }

        if (field.maxSelected !== undefined && selectedValues.length > field.maxSelected) {
          return buildFieldValidationError(
            "too_many_selected",
            field.key,
            `「${field.label}」の選択数が不正です。${field.maxSelected}個以内で選択してください（現在${selectedValues.length}個）。`,
          );
        }

        finalizedFieldValues[field.key] = selectedValues;
        continue;
      }

      if (field.type === "number") {
        const numericValue = typeof incoming === "number" ? incoming : typeof incoming === "string" ? Number(incoming) : NaN;

        if (!Number.isFinite(numericValue)) {
          return NextResponse.json({ error: "invalid_number_value", field: field.key }, { status: 400 });
        }

        if (field.min !== undefined && numericValue < field.min) {
          return NextResponse.json({ error: "number_too_small", field: field.key }, { status: 400 });
        }

        if (field.max !== undefined && numericValue > field.max) {
          return NextResponse.json({ error: "number_too_large", field: field.key }, { status: 400 });
        }

        finalizedFieldValues[field.key] = numericValue;
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

    // 月間実施上限（monthlyCount）をサーバー側でも検証する。
    // クライアントの「達成済み」無効化は直叩き等でバイパス可能なため、報酬ポイントの上限逸脱をここで防ぐ。
    const approvedReportsThisMonthForMission = existingReports.filter(
      (item) =>
        item.status === "APPROVED" &&
        item.missionId === missionId &&
        toYearMonth(item.reportedAt) === currentYearMonth,
    );
    if (approvedReportsThisMonthForMission.length >= mission.monthlyCount) {
      return NextResponse.json(
        { error: "monthly_count_exceeded", message: "このミッションは今月の実施回数の上限に達しています。" },
        { status: 409 },
      );
    }

    const scoreGranted = mission.score;
    const pointGranted = calculateMissionRewardPoint({
      score: scoreGranted,
      perEmployeeMonthlyFee: company.perEmployeeMonthlyFee,
    });

    // レビューフローは廃止。提出時点で即承認扱いとし、点数/ポイントを確定させる。
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
      scoreGranted,
      pointGranted,
      createdAt: reportedAt,
      updatedAt: reportedAt,
    };
    const approvedReportsThisMonth = existingReports.filter(
      (item) => item.status === "APPROVED" && toYearMonth(item.reportedAt) === currentYearMonth,
    );
    const nextMissionCompletedCount = approvedReportsThisMonth.length + 1;
    const nextEarnedScore =
      approvedReportsThisMonth.reduce((sum, item) => sum + (item.scoreGranted ?? 0), 0) + scoreGranted;
    const nextEarnedPoints =
      approvedReportsThisMonth.reduce((sum, item) => sum + (item.pointGranted ?? 0), 0) + pointGranted;
    const totalMonthlyMissionCount = enabledMissions.reduce((sum, item) => sum + item.monthlyCount, 0);
    const nextCompletionRate = toCompletionRate(nextMissionCompletedCount, totalMonthlyMissionCount);
    // ポイントは即時反映せず「今月の未反映分(pending)」へ積む。
    // まず前月以前の pending があれば利用可能残高へ繰り入れ(reflect)、その上で今月分を加算する。
    const reflected = reflectPoints(user, currentYearMonth);
    const nextSpendablePointBalance = reflected.spendablePoint; // 報酬では利用可能残高は増えない
    const nextPendingPointBalance = reflected.pendingPoint + pointGranted;
    const totalHoldingAfter = nextSpendablePointBalance + nextPendingPointBalance;
    const statsUpdatedAt = reportedAt;
    const pointTransaction =
      pointGranted === 0
        ? null
        : createPointTransaction({
            companyId,
            userId: user.userId,
            transactionId: randomUUID(),
            occurredAt: reportedAt,
            type: "MISSION_REWARD",
            deltaPoint: pointGranted,
            balanceAfter: totalHoldingAfter,
            sourceType: "MISSION_REPORT",
            sourceId: reportId,
            actorType: "EMPLOYEE",
            actorUserId: user.userId,
            description: mission.title,
          });
    const client = getDynamoDocumentClient(region);

    // 楽観ロック: 読み込み時点のポイント残高から変化していない場合のみ確定する。
    // ポイント残高は交換・返金・運用者/管理者の手動調整など他経路からも更新されるため、
    // 条件を付けずに絶対値で SET すると、それらの更新を古いスナップショットで黙って巻き戻してしまう。
    const userConditionExpressions = ["currentPointBalance = :expectedCurrentPointBalance"];
    const userConditionValues: Record<string, unknown> = {
      ":expectedCurrentPointBalance": user.currentPointBalance ?? 0,
    };

    if (user.pendingPointBalance === undefined) {
      userConditionExpressions.push("attribute_not_exists(pendingPointBalance)");
    } else {
      userConditionExpressions.push("pendingPointBalance = :expectedPendingPointBalance");
      userConditionValues[":expectedPendingPointBalance"] = user.pendingPointBalance;
    }

    if (user.pendingPointYearMonth === undefined) {
      userConditionExpressions.push("attribute_not_exists(pendingPointYearMonth)");
    } else {
      userConditionExpressions.push("pendingPointYearMonth = :expectedPendingPointYearMonth");
      userConditionValues[":expectedPendingPointYearMonth"] = user.pendingPointYearMonth;
    }

    try {
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
            ...(pointTransaction ? [createPointTransactionPutTransactItem(pointTransactionTableName, pointTransaction)] : []),
            {
              Update: {
                TableName: userTableName,
                Key: {
                  companyId,
                  sk: buildUserSk(user.userId),
                },
                ConditionExpression: userConditionExpressions.join(" AND "),
                UpdateExpression:
                  "SET currentPointBalance = :currentPointBalance, pendingPointBalance = :pendingPointBalance, pendingPointYearMonth = :pendingPointYearMonth, currentMonthCompletionRate = :currentMonthCompletionRate, updatedAt = :updatedAt",
                ExpressionAttributeValues: {
                  ...userConditionValues,
                  ":currentPointBalance": nextSpendablePointBalance,
                  ":pendingPointBalance": nextPendingPointBalance,
                  ":pendingPointYearMonth": currentYearMonth,
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
    } catch (error) {
      if (isTransactionConditionalCheckFailure(error)) {
        // 送信中に残高が他経路で更新された。クライアントに再試行を促す。
        return NextResponse.json(
          {
            error: "point_balance_conflict",
            message: "ポイント残高が更新されたため、送信できませんでした。画面を更新してもう一度お試しください。",
          },
          { status: 409 },
        );
      }

      throw error;
    }

    return NextResponse.json({
      reportId,
      reportedAt,
      status: report.status,
      pointGranted,
    });
  } catch (error) {
    console.error("POST /api/submit-mission-report error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
