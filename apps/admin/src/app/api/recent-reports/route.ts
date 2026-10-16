import { NextResponse } from "next/server";
import { getRecentReportsFromDynamo } from "@correcre/individual-analysis/server";

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

  // 対象企業はセッションの管理者の所属企業で確定する。userId は自社の従業員での絞り込み（任意）。
  const companyId = currentAdminUser.companyId;
  const limitStr = searchParams.get("limit");
  const userId = searchParams.get("userId") ?? undefined;
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;

  const parsedLimit = limitStr ? parseInt(limitStr, 10) : undefined;
  const limit = typeof parsedLimit === "number" && Number.isFinite(parsedLimit) ? parsedLimit : undefined;

  try {
    const reports = await getRecentReportsFromDynamo(companyId, limit, userId, startDate, endDate);
    return NextResponse.json(reports);
  } catch (err) {
    console.error("GET /api/recent-reports error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
