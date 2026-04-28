import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { getPublishedMerchandiseDetail } from "@employee/features/exchange/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ merchandiseId: string }>;
};

export async function GET(req: Request, { params }: RouteParams) {
  try {
    await requireCurrentEmployeeUser();
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");
    const { merchandiseId } = await params;

    if (!merchantId) {
      return NextResponse.json({ error: "merchantId は必須です" }, { status: 400 });
    }

    const item = await getPublishedMerchandiseDetail(merchantId, merchandiseId);
    if (!item) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (err) {
    console.error("GET /api/exchange/[merchandiseId] error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
