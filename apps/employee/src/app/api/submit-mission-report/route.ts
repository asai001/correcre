import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getMissionBySlot } from "@correcre/lib/dynamodb/mission";
import { putMissionReport } from "@correcre/lib/dynamodb/mission-report";
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

    await putMissionReport({ region, tableName: missionReportTableName }, report);

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
