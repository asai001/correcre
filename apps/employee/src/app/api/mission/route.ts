import { getMissionFromDynamoMock } from "@employee/features/mission-report/api/server.mock";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const userId = searchParams.get("userId");

  if (!companyId || !userId) {
    return NextResponse.json({ error: "companyId と userId は必須です" }, { status: 400 });
  }

  try {
    const res = await getMissionFromDynamoMock(companyId, userId);
    return NextResponse.json(res);
  } catch (err) {
    console.error("GET /api/mission error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
