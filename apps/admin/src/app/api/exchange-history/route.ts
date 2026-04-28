import { NextResponse } from "next/server";

import { listExchangeHistoryByCompanyAndUser } from "@correcre/lib/dynamodb/exchange-history";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { ExchangeHistoryStatus } from "@correcre/types";

type ExchangeHistoryResponse = {
  date: string;
  merchandiseName: string;
  usedPoint: number;
  status?: ExchangeHistoryStatus;
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

  const parsedLimit = limitStr ? Number.parseInt(limitStr, 10) : undefined;
  const limit = typeof parsedLimit === "number" && Number.isFinite(parsedLimit) ? parsedLimit : undefined;

  try {
    const items = await listExchangeHistoryByCompanyAndUser(
      {
        region: readRequiredServerEnv("AWS_REGION"),
        tableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
      },
      companyId,
      userId,
    );

    const sortedItems = items
      .filter((item) => isWithinDateRange(item.exchangedAt, startDate, endDate))
      .sort((a, b) => (a.exchangedAt < b.exchangedAt ? 1 : -1));

    const response = (typeof limit === "number" ? sortedItems.slice(0, limit) : sortedItems).map<ExchangeHistoryResponse>((item) => ({
      date: item.exchangedAt.slice(0, 10).replaceAll("-", "/"),
      merchandiseName: item.merchandiseNameSnapshot,
      usedPoint: item.usedPoint,
      status: item.status,
    }));

    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /api/exchange-history error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
