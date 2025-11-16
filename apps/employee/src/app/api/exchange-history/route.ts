// employee/src/app/api/exchange-history/route.ts

import { NextResponse } from "next/server";
import { getExchangeHistoryFromDynamoMock } from "@employee/features/exchange-history/api/server.mock";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const userId = searchParams.get("userId");
  const limitParam = searchParams.get("limit");

  if (!companyId || !userId) {
    return NextResponse.json({ error: "companyId と userId は必須です" }, { status: 400 });
  }

  const limit = limitParam ? Number(limitParam) : 10;

  try {
    const history = await getExchangeHistoryFromDynamoMock(companyId, userId, limit);
    return NextResponse.json(history);
  } catch (err) {
    console.error("GET /api/exchange-history error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
