import { NextResponse } from "next/server";
import { getExchangeHistoryFromDynamo } from "@employee/features/exchange-history/api/server";
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
  const limitParam = searchParams.get("limit");
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;

  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    const history = await getExchangeHistoryFromDynamo(companyId, userId, startDate, endDate, limit);
    return NextResponse.json(history);
  } catch (err) {
    console.error("GET /api/exchange-history error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
