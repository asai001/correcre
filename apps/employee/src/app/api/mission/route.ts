import { getMissionFromDynamo } from "@employee/features/mission-report/api/server";
import { NextResponse } from "next/server";

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

  try {
    const res = await getMissionFromDynamo(companyId, userId);
    return NextResponse.json(res);
  } catch (err) {
    console.error("GET /api/mission error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
