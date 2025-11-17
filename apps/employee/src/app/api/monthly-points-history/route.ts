import { NextResponse } from "next/server";
import { getMonthlyPointsHistoryFromDynamoMock } from "@employee/features/monthly-points-history/api/server.mock";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const userId = searchParams.get("userId");
  const monthsParam = searchParams.get("months");

  if (!companyId || !userId) {
    return NextResponse.json({ error: "companyId と userId は必須です" }, { status: 400 });
  }

  const months = monthsParam ? Number(monthsParam) : 24;

  try {
    const history = await getMonthlyPointsHistoryFromDynamoMock(companyId, userId, months);
    return NextResponse.json(history);
  } catch (err) {
    console.error("GET /api/monthly-points-history error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
