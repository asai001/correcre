import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import {
  addExchangeFavoriteForEmployee,
  listExchangeFavoritesForEmployee,
  removeExchangeFavoriteForEmployee,
} from "@employee/features/exchange-favorite/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireCurrentEmployeeUser();
    const result = await listExchangeFavoritesForEmployee({
      companyId: user.companyId,
      userId: user.userId,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/exchange/favorites error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

type PostBody = {
  merchantId?: unknown;
  merchandiseId?: unknown;
};

export async function POST(req: Request) {
  try {
    const user = await requireCurrentEmployeeUser();

    let body: PostBody | null = null;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const merchantId = typeof body?.merchantId === "string" ? body.merchantId.trim() : "";
    const merchandiseId = typeof body?.merchandiseId === "string" ? body.merchandiseId.trim() : "";

    if (!merchantId || !merchandiseId) {
      return NextResponse.json({ error: "merchantId と merchandiseId は必須です" }, { status: 400 });
    }

    const result = await addExchangeFavoriteForEmployee({
      companyId: user.companyId,
      userId: user.userId,
      merchantId,
      merchandiseId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/exchange/favorites error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireCurrentEmployeeUser();
    const url = new URL(req.url);
    const merchantId = (url.searchParams.get("merchantId") ?? "").trim();
    const merchandiseId = (url.searchParams.get("merchandiseId") ?? "").trim();

    if (!merchantId || !merchandiseId) {
      return NextResponse.json({ error: "merchantId と merchandiseId は必須です" }, { status: 400 });
    }

    await removeExchangeFavoriteForEmployee({
      companyId: user.companyId,
      userId: user.userId,
      merchantId,
      merchandiseId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/exchange/favorites error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
