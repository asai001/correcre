import { NextResponse } from "next/server";
import { getAvgPointsTrendFromDynamoMock } from "@admin/features/avg-points-trend/api/server.mock";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const monthsParam = searchParams.get("months");

  if (!companyId) {
    return NextResponse.json({ error: "companyId は必須です" }, { status: 400 });
  }

  const monthsRaw = monthsParam ? Number(monthsParam) : 12;
  const months = !monthsRaw || monthsRaw < 1 || !Number.isFinite(monthsRaw) ? 12 : monthsRaw; // monthsParam が Nan や負数の場合の考慮

  try {
    const history = await getAvgPointsTrendFromDynamoMock(companyId, months);
    return NextResponse.json(history);
  } catch (err) {
    console.error("GET /api/avg-points-trend error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
