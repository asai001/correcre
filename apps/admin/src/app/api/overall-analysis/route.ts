import { NextResponse } from "next/server";
import { getOverallAnalysisSummaryFromDynamo } from "@admin/features/overall-analysis/api/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const departmentId = searchParams.get("departmentId") ?? undefined;

  if (!companyId || !startDate || !endDate) {
    return NextResponse.json({ error: "companyId, startDate, endDate are required" }, { status: 400 });
  }

  try {
    const summary = await getOverallAnalysisSummaryFromDynamo(companyId, startDate, endDate, departmentId);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/overall-analysis error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
