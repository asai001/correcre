import { getDashboardSummaryFromDynamoMock } from "@admin/features/dashboard-summary/api/server.mock";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const userId = searchParams.get("userId");
  const targetYearMonth = searchParams.get("targetYearMonth");

  if (!companyId || !userId || !targetYearMonth) {
    return NextResponse.json({ error: "companyId と userId は必須です" }, { status: 400 });
  }

  try {
    const summary = await getDashboardSummaryFromDynamoMock(companyId, userId, targetYearMonth);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/user error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
