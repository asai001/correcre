import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { setMerchandiseStatusForMerchant } from "@merchant/features/merchandise/api/server";
import type { UpdateMerchandiseStatusRequest } from "@merchant/features/merchandise/model/types";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

const ALLOWED_STATUSES = ["DRAFT", "PUBLISHED", "UNPUBLISHED"] as const;

async function authorize() {
  const access = await getMerchantAccessStatus();

  if (access.allowed) {
    return { user: access.user, error: null as null | NextResponse };
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "merchant_only";

  return { user: null, error: NextResponse.json({ error }, { status }) };
}

type RouteContext = {
  params: Promise<{ merchandiseId: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const { user, error } = await authorize();
  if (error) return error;

  const { merchandiseId } = await context.params;
  let body: UpdateMerchandiseStatusRequest | null = null;

  try {
    body = (await req.json()) as UpdateMerchandiseStatusRequest;
  } catch (err) {
    console.error("PATCH /api/merchandise/[merchandiseId]/status invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || !ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const item = await setMerchandiseStatusForMerchant(user!.merchantId, merchandiseId, body.status);
    return NextResponse.json(item);
  } catch (err) {
    console.error("PATCH /api/merchandise/[merchandiseId]/status error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

    if (err instanceof Error) {
      const status = err.message === "Merchandise not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
