import { NextResponse } from "next/server";
import { getAvgItemCompletionFromDynamo } from "@admin/features/avg-item-completion/api/server";
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
  const thisYearMonth = searchParams.get("thisYearMonth");

  if (!thisYearMonth) {
    return NextResponse.json({ error: "thisYearMonth は必須です" }, { status: 400 });
  }

  try {
    const history = await getAvgItemCompletionFromDynamo(companyId, thisYearMonth);
    return NextResponse.json(history);
  } catch (err) {
    console.error("GET /api/avg-item-completion error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
