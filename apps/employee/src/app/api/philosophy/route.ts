import { getPhilosophyFromDynamo } from "@employee/features/philosophy/api/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "companyId は必須です" }, { status: 400 });
  }

  try {
    const summary = await getPhilosophyFromDynamo(companyId);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/philosophy error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
