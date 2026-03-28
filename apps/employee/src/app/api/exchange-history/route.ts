import { NextResponse } from "next/server";
import { getExchangeHistoryFromDynamoMock } from "@employee/features/exchange-history/api/server.mock";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const userId = searchParams.get("userId");
  const limitParam = searchParams.get("limit");
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;

  if (!companyId || !userId) {
    return NextResponse.json({ error: "companyId と userId は必須です" }, { status: 400 });
  }

  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    const history = await getExchangeHistoryFromDynamoMock(companyId, userId);
    const filteredHistory = history.filter(
      (item) => (!startDate || item.date >= startDate) && (!endDate || item.date <= endDate)
    );
    const limitedHistory = Number.isFinite(limit) ? filteredHistory.slice(0, limit) : filteredHistory;

    return NextResponse.json(limitedHistory);
  } catch (err) {
    console.error("GET /api/exchange-history error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
