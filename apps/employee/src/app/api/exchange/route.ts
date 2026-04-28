import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { listPublishedMerchandiseForEmployee } from "@employee/features/exchange/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireCurrentEmployeeUser();
    const items = await listPublishedMerchandiseForEmployee();
    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/exchange error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
