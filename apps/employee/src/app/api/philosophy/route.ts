import { getPhilosophyFromDynamo } from "@employee/features/philosophy/api/server";
import { NextResponse } from "next/server";

import { authorizeEmployeeApiRequest, rejectForeignScopeQuery } from "@employee/lib/auth/api-authorize";

export async function GET(req: Request) {
  const { unauthorized, currentUser } = await authorizeEmployeeApiRequest();
  if (unauthorized || !currentUser) {
    return unauthorized;
  }

  const { searchParams } = new URL(req.url);
  const forbidden = rejectForeignScopeQuery(searchParams, currentUser, { checkUserId: false });
  if (forbidden) {
    return forbidden;
  }

  // 対象企業はセッションの従業員の所属企業で確定する。
  const { companyId } = currentUser;

  try {
    const summary = await getPhilosophyFromDynamo(companyId);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/philosophy error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
