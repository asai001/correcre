import { NextResponse } from "next/server";
import { getAvgItemCompletionFromDynamo } from "@admin/features/avg-item-completion/api/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const thisYearMonth = searchParams.get("thisYearMonth");

  if (!companyId || !thisYearMonth) {
    return NextResponse.json({ error: "companyId と thisYearMonth は必須です" }, { status: 400 });
  }

  try {
    const history = await getAvgItemCompletionFromDynamo(companyId, thisYearMonth);
    return NextResponse.json(history);
  } catch (err) {
    console.error("GET /api/avg-item-completion error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
