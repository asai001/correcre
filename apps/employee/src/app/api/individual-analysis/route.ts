import { NextResponse } from "next/server";
import { getIndividualAnalysisSummaryFromDynamo } from "@correcre/individual-analysis/server";

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

  // 対象はセッションの従業員本人で確定する。
  const { companyId, userId } = currentUser;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate, endDate are required" }, { status: 400 });
  }

  try {
    const summary = await getIndividualAnalysisSummaryFromDynamo(companyId, userId, startDate, endDate);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/individual-analysis error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
