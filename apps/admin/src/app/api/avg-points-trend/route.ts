import { NextResponse } from "next/server";
import { getAvgPointsTrendFromDynamo } from "@admin/features/avg-points-trend/api/server";
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
  const monthsParam = searchParams.get("months");

  const monthsRaw = monthsParam ? Number(monthsParam) : 12;
  const months = !monthsRaw || monthsRaw < 1 || !Number.isFinite(monthsRaw) ? 12 : monthsRaw; // monthsParam が Nan や負数の場合の考慮

  try {
    const history = await getAvgPointsTrendFromDynamo(companyId, months);
    return NextResponse.json(history);
  } catch (err) {
    console.error("GET /api/avg-points-trend error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
