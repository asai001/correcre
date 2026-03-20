import { NextResponse } from "next/server";
import { getEmployeeManagementSummaryFromDynamoMock } from "@admin/features/employee-management/api/server.mock";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const adminUserId = searchParams.get("adminUserId") ?? undefined;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const summary = await getEmployeeManagementSummaryFromDynamoMock(companyId, adminUserId);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/employee-management error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
