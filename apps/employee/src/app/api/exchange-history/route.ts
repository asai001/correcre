import { NextResponse } from "next/server";
import { getExchangeHistoryFromDynamo } from "@employee/features/exchange-history/api/server";

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
    const history = await getExchangeHistoryFromDynamo(companyId, userId, startDate, endDate, limit);
    return NextResponse.json(history);
  } catch (err) {
    console.error("GET /api/exchange-history error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
