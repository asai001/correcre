import { NextRequest, NextResponse } from "next/server";

import { listMissionsForCompany } from "@operator/features/mission-management/api/server";
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

// GET /api/missions?companyId=xxx
export async function GET(req: NextRequest) {
  const { error } = await authorizeOperator();
  if (error) return error;

  const companyId = req.nextUrl.searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const missions = await listMissionsForCompany(companyId);
    return NextResponse.json(missions);
  } catch (err) {
    console.error("GET /api/missions error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
