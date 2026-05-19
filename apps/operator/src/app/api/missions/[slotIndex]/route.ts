import { NextRequest, NextResponse } from "next/server";

import { updateMissionInDynamo } from "@operator/features/mission-management/api/server";
import type { UpdateMissionInput } from "@operator/features/mission-management/model/types";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

async function authorizeOperator() {
  const access = await getOperatorAccessStatus();

  if (access.allowed) {
    return { error: null, userId: access.user.userId };
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const errorCode = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";

  return { error: NextResponse.json({ error: errorCode }, { status }), userId: null };
}

// PUT /api/missions/:slotIndex?companyId=xxx
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slotIndex: string }> }) {
  const { error, userId } = await authorizeOperator();
  if (error) return error;

  const { slotIndex: slotIndexParam } = await params;
  const companyId = req.nextUrl.searchParams.get("companyId");
  const slotIndex = Number(slotIndexParam);

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  if (!Number.isInteger(slotIndex) || slotIndex < 1 || slotIndex > 5) {
    return NextResponse.json({ error: "invalid slotIndex" }, { status: 400 });
  }

  let body: UpdateMissionInput | null = null;

  try {
    body = (await req.json()) as UpdateMissionInput;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const updated = await updateMissionInDynamo(companyId, slotIndex, body, userId!);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`PUT /api/missions/${slotIndex} error`, err);

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
