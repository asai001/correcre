import { getDashboardSummaryFromDynamo } from "@admin/features/dashboard-summary/api/server";
import { NextResponse } from "next/server";

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

  // 対象企業はセッションの管理者の所属企業で確定する。userId は自社の従業員を指定する。
  const companyId = currentAdminUser.companyId;
  const userId = searchParams.get("userId");
  const targetYearMonth = searchParams.get("targetYearMonth");

  if (!userId || !targetYearMonth) {
    return NextResponse.json({ error: "userId と targetYearMonth は必須です" }, { status: 400 });
  }

  try {
    const summary = await getDashboardSummaryFromDynamo(companyId, userId, targetYearMonth);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/dashboard-summary error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
