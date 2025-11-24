import { NextResponse } from "next/server";
import { getAvgItemCompletionFromDynamoMock } from "@admin/features/avg-item-completion/api/server.mock";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const thisYearMonth = searchParams.get("thisYearMonth");

  if (!companyId || !thisYearMonth) {
    return NextResponse.json({ error: "companyId と thisYearMonth は必須です" }, { status: 400 });
  }

  try {
    const history = await getAvgItemCompletionFromDynamoMock(companyId, thisYearMonth);
    return NextResponse.json(history);
  } catch (err) {
    console.error("GET /api/avg-points-trend error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
