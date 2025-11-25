import { NextResponse } from "next/server";
import { getRecentReportsFromDynamoMock } from "@admin/features/recent-reports/api/server.mock";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const limitStr = searchParams.get("limit");

  if (!companyId) {
    return NextResponse.json({ error: "companyId は必須です" }, { status: 400 });
  }

  const limit = limitStr ? parseInt(limitStr, 10) : 5;

  try {
    const reports = await getRecentReportsFromDynamoMock(companyId, limit);
    return NextResponse.json(reports);
  } catch (err) {
    console.error("GET /api/recent-reports error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
