import { NextResponse } from "next/server";
import data from "../../../../../mock/dynamodb.json";

type ExchangeHistoryRecord = {
  companyId: string;
  userId: string;
  exchangeId: string;
  exchangedAt: string;
  merchandiseName: string;
  usedPoint: number;
};

type ExchangeHistoryResponse = {
  date: string;
  merchandiseName: string;
  usedPoint: number;
};

function isWithinDateRange(dateTime: string, startDate?: string, endDate?: string) {
  const date = dateTime.slice(0, 10);
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const userId = searchParams.get("userId");
  const limitStr = searchParams.get("limit");
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;

  if (!companyId || !userId) {
    return NextResponse.json({ error: "companyId and userId are required" }, { status: 400 });
  }

  const parsedLimit = limitStr ? Number.parseInt(limitStr, 10) : 3;
  const limit = Number.isNaN(parsedLimit) ? 3 : parsedLimit;

  try {
    const items = ((data as { ExchangeHistory?: ExchangeHistoryRecord[] }).ExchangeHistory ?? [])
      .filter(
        (item) => item.companyId === companyId && item.userId === userId && isWithinDateRange(item.exchangedAt, startDate, endDate)
      )
      .sort((a, b) => (a.exchangedAt < b.exchangedAt ? 1 : -1))
      .slice(0, limit)
      .map<ExchangeHistoryResponse>((item) => ({
        date: item.exchangedAt.slice(0, 10).replaceAll("-", "/"),
        merchandiseName: item.merchandiseName,
        usedPoint: item.usedPoint,
      }));

    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/exchange-history error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
