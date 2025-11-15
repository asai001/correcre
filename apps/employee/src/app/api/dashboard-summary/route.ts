import { getDashboardSummaryFromDynamoMock } from "@employee/features/dashboard-summary/api/server.mock";
import { NextResponse } from "next/server";
// import { getDashboardSummaryFromDynamo } from "@employee/features/dashboard-summary/api/server";

import { isValidYYYYMM } from "@correcre/lib";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const userId = searchParams.get("userId");
  const targetYearMonth = searchParams.get("targetYearMonth");

  if (!companyId || !userId || !targetYearMonth) {
    return NextResponse.json({ error: "companyId と userId は必須です" }, { status: 400 });
  }

  if (!isValidYYYYMM(targetYearMonth)) {
    return NextResponse.json({ error: "targetYearMonth は YYYY-MM 形式です" }, { status: 400 });
  }

  try {
    // const summary = await getDashboardSummaryFromDynamo(companyId, userId);
    const summary = await getDashboardSummaryFromDynamoMock(companyId, userId, targetYearMonth);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/dashboard-summary error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
