import { NextResponse } from "next/server";
import { getMonthlyPointsHistoryFromDynamo } from "@employee/features/monthly-points-history/api/server";
import { authorizeEmployeeApiRequest, rejectForeignScopeQuery } from "@employee/lib/auth/api-authorize";

export async function GET(req: Request) {
  const { unauthorized, currentUser } = await authorizeEmployeeApiRequest();
  if (unauthorized || !currentUser) {
    return unauthorized;
  }

  const { searchParams } = new URL(req.url);
  const forbidden = rejectForeignScopeQuery(searchParams, currentUser);
  if (forbidden) {
    return forbidden;
  }

  // 対象はセッションの従業員本人で確定する。
  const { companyId, userId } = currentUser;
  const monthsParam = searchParams.get("months");

  const months = monthsParam ? Number(monthsParam) : 24;

  try {
    const history = await getMonthlyPointsHistoryFromDynamo(companyId, userId, months);
    return NextResponse.json(history);
  } catch (err) {
    console.error("GET /api/monthly-points-history error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
