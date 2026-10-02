import { getLoginInfoFromDynamo } from "@employee/features/login-info/api/server";
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
    const summary = await getLoginInfoFromDynamo(companyId, userId);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/login-info error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
