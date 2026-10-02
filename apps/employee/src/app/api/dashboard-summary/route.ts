import { getDashboardSummaryFromDynamo } from "@employee/features/dashboard-summary/api/server";
import { NextResponse } from "next/server";

import { isValidYYYYMM } from "@correcre/lib";

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
  const targetYearMonth = searchParams.get("targetYearMonth");

  if (!targetYearMonth) {
    return NextResponse.json({ error: "targetYearMonth は必須です" }, { status: 400 });
  }

  if (!isValidYYYYMM(targetYearMonth)) {
    return NextResponse.json({ error: "targetYearMonth は YYYY-MM 形式です" }, { status: 400 });
  }

  try {
    const summary = await getDashboardSummaryFromDynamo(companyId, userId, targetYearMonth);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/dashboard-summary error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
