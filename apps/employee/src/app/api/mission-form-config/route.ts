import { NextResponse } from "next/server";

import { getMissionFromDynamo } from "@employee/features/mission-report/api/server";
import type { FormConfig, Mission } from "@employee/features/mission-report/model/types";
import { authorizeEmployeeApiRequest, rejectForeignScopeQuery } from "@employee/lib/auth/api-authorize";

export async function GET(req: Request) {
  const { unauthorized, currentUser } = await authorizeEmployeeApiRequest();
  if (unauthorized || !currentUser) {
    return unauthorized;
  }

  const { searchParams } = new URL(req.url);
  const forbidden = rejectForeignScopeQuery(searchParams, currentUser, { checkUserId: false });
  if (forbidden) {
    return forbidden;
  }

  // 対象企業はセッションの従業員の所属企業で確定する。
  const { companyId } = currentUser;
  const missionId = searchParams.get("missionId");

  if (!missionId) {
    return NextResponse.json({ error: "missionId is required" }, { status: 400 });
  }

  try {
    // Reuse the mission loader and select the requested mission only.
    const { mission } = await getMissionFromDynamo(companyId, "__form__");

    const target = mission.find((item) => item.missionId === missionId);
    if (!target) {
      return NextResponse.json({ error: "mission_not_found" }, { status: 404 });
    }

    return NextResponse.json(missionToFormConfig(target));
  } catch (error) {
    console.error("GET /api/mission-form-config error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

function missionToFormConfig(mission: Mission): FormConfig {
  return {
    companyId: mission.companyId,
    missionId: mission.missionId,
    version: mission.version,
    title: mission.title,
    fields: mission.fields.map((field, index) => ({
      id: field.id || createFieldId(field.label, index),
      label: field.label,
      type: field.type,
      placeholder: field.placeholder,
      helpText: field.helpText,
      required: field.required,
      rows: field.rows,
      minLength: field.minLength,
      maxLength: field.maxLength,
      min: field.min,
      max: field.max,
      minSelected: field.minSelected,
      maxSelected: field.maxSelected,
      step: field.step,
      selectValueType: field.selectValueType,
      options: field.options,
      defaultValue: field.defaultValue,
    })),
    points: mission.score ?? 0,
    monthlyCount: mission.monthlyCount ?? 0,
    order: mission.order,
    enabled: mission.enabled,
  };
}

function createFieldId(label: string, index: number): string {
  const base = label
    .trim()
    .normalize("NFKC")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();

  return base || `field${index + 1}`;
}
