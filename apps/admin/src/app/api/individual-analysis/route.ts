import { NextResponse } from "next/server";
import { getIndividualAnalysisSummaryFromDynamoMock } from "@correcre/individual-analysis/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const userId = searchParams.get("userId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!companyId || !userId || !startDate || !endDate) {
    return NextResponse.json({ error: "companyId, userId, startDate, endDate are required" }, { status: 400 });
  }

  try {
    const summary = await getIndividualAnalysisSummaryFromDynamoMock(companyId, userId, startDate, endDate);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/individual-analysis error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
