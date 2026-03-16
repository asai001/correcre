import { NextResponse } from "next/server";
import { getRecentReportsFromDynamoMock } from "@admin/features/recent-reports/api/server.mock";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const limitStr = searchParams.get("limit");
  const userId = searchParams.get("userId") ?? undefined;
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const limit = limitStr ? parseInt(limitStr, 10) : 5;

  try {
    const reports = await getRecentReportsFromDynamoMock(companyId, limit, userId, startDate, endDate);
    return NextResponse.json(reports);
  } catch (err) {
    console.error("GET /api/recent-reports error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
