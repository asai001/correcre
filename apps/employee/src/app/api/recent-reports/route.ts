import { NextResponse } from "next/server";
import { getRecentReportsFromDynamo } from "@correcre/individual-analysis/server";

import { authorizeEmployeeApiRequest, rejectForeignScopeQuery } from "@employee/lib/auth/api-authorize";

export async function GET(req: Request) {
  const { unauthorized, currentUser } = await authorizeEmployeeApiRequest();
  if (unauthorized || !currentUser) {
    return unauthorized;
  }

  const { searchParams } = new URL(req.url);
  const forbidden = rejectForeignScopeQuery(searchParams, currentUser);
  if (forbidden) {
    return forbidden;
  }

  // 従業員が見られる報告は自分のものだけ。対象はセッションの従業員本人で確定する。
  const { companyId, userId } = currentUser;
  const limitStr = searchParams.get("limit");
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;

  const parsedLimit = limitStr ? parseInt(limitStr, 10) : undefined;
  const limit = typeof parsedLimit === "number" && Number.isFinite(parsedLimit) ? parsedLimit : undefined;

  try {
    const reports = await getRecentReportsFromDynamo(companyId, limit, userId, startDate, endDate);
    return NextResponse.json(reports);
  } catch (err) {
    console.error("GET /api/recent-reports error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
