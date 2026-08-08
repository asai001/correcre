import { NextRequest, NextResponse } from "next/server";

import { cancelScheduledMissionChange } from "@operator/features/mission-management/api/server";
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

// DELETE /api/missions/:slotIndex/scheduled?companyId=xxx
// 「翌月月初から反映」予約(pendingChange)を取り消す。
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slotIndex: string }> }) {
  const { error } = await authorizeOperator();
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

  try {
    const updated = await cancelScheduledMissionChange(companyId, slotIndex);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`DELETE /api/missions/${slotIndex}/scheduled error`, err);

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
