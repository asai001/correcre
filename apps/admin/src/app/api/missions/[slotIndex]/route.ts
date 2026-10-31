import { NextResponse } from "next/server";

import {
  updateMissionInDynamo,
  type MissionApplyMode,
  type UpdateMissionInput,
} from "@correcre/mission-management/server";

import { authorizeEmployeeManagementRequest } from "../../employee-management/authorize";
import { invalidSlotIndexResponse, missionErrorResponse, parseSlotIndex } from "../respond";

// リクエストボディから、管理者が変更できるミッションの項目だけを取り出す。
// companyId など他の項目が含まれていても使わない（対象企業は常にセッションから決める）。
function toUpdateMissionInput(body: unknown): UpdateMissionInput | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const value = body as Record<string, unknown>;

  if (
    typeof value.title !== "string" ||
    typeof value.description !== "string" ||
    typeof value.category !== "string" ||
    typeof value.monthlyCount !== "number" ||
    typeof value.score !== "number" ||
    typeof value.enabled !== "boolean" ||
    !Array.isArray(value.fields)
  ) {
    return null;
  }

  return {
    title: value.title,
    description: value.description,
    category: value.category,
    monthlyCount: value.monthlyCount,
    score: value.score,
    enabled: value.enabled,
    fields: value.fields as UpdateMissionInput["fields"],
    analysisThresholds: (value.analysisThresholds ?? null) as UpdateMissionInput["analysisThresholds"],
  };
}

// PUT /api/missions/:slotIndex
// 自社のミッションを新規設定・編集する。applyMode="scheduled" なら翌月月初から反映する予約にする。
// 変更者（履歴の changedByUserId / 予約の scheduledByUserId）はセッションの管理者。
export async function PUT(req: Request, { params }: { params: Promise<{ slotIndex: string }> }) {
  const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
  if (unauthorized || !currentAdminUser) {
    return unauthorized;
  }

  const { slotIndex: slotIndexParam } = await params;
  const slotIndex = parseSlotIndex(slotIndexParam);

  if (slotIndex === null) {
    return invalidSlotIndexResponse();
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const input = toUpdateMissionInput(body);

  if (!input) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const applyMode: MissionApplyMode =
    (body as { applyMode?: unknown }).applyMode === "scheduled" ? "scheduled" : "immediate";

  try {
    const updated = await updateMissionInDynamo(
      currentAdminUser.companyId,
      slotIndex,
      input,
      currentAdminUser.userId,
      applyMode,
    );
    return NextResponse.json(updated);
  } catch (err) {
    return missionErrorResponse(err, `PUT /api/missions/${slotIndex}`);
  }
}
