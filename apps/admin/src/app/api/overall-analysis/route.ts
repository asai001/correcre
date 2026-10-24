import { NextResponse } from "next/server";
import { getOverallAnalysisSummaryFromDynamo } from "@admin/features/overall-analysis/api/server";
import { authorizeAdminApiRequest, rejectForeignCompanyQuery } from "@admin/lib/auth/api-authorize";

export async function GET(req: Request) {
  const { unauthorized, currentAdminUser } = await authorizeAdminApiRequest();
  if (unauthorized || !currentAdminUser) {
    return unauthorized;
  }

  const { searchParams } = new URL(req.url);
  const forbidden = rejectForeignCompanyQuery(searchParams, currentAdminUser);
  if (forbidden) {
    return forbidden;
  }

  // 対象企業はセッションの管理者の所属企業で確定する。
  const companyId = currentAdminUser.companyId;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const departmentId = searchParams.get("departmentId") ?? undefined;

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate, endDate are required" }, { status: 400 });
  }

  try {
    const summary = await getOverallAnalysisSummaryFromDynamo(companyId, startDate, endDate, departmentId);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/overall-analysis error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
