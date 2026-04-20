import { NextRequest, NextResponse } from "next/server";

import { listMissionHistoryForSlot } from "@operator/features/mission-management/api/server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

async function authorizeOperator() {
  const access = await getOperatorAccessStatus();

  if (access.allowed) {
    return null;
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const errorCode = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";

  return NextResponse.json({ error: errorCode }, { status });
}

// GET /api/missions/:slotIndex/history?companyId=xxx
export async function GET(req: NextRequest, { params }: { params: Promise<{ slotIndex: string }> }) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) return unauthorized;

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
    const history = await listMissionHistoryForSlot(companyId, slotIndex);
    return NextResponse.json(history);
  } catch (err) {
    console.error(`GET /api/missions/${slotIndex}/history error`, err);

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
