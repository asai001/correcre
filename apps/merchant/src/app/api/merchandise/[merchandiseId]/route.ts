import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import {
  getMerchandiseForMerchant,
  updateMerchandiseForMerchant,
} from "@merchant/features/merchandise/api/server";
import type { UpdateMerchandiseRequest } from "@merchant/features/merchandise/model/types";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "商品の処理に失敗しました。時間をおいて再度お試しください。";

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

export async function GET(_req: Request, context: RouteContext) {
  const { user, error } = await authorize();
  if (error) return error;

  const { merchandiseId } = await context.params;

  try {
    const item = await getMerchandiseForMerchant(user!.merchantId, merchandiseId);

    if (!item) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (err) {
    console.error("GET /api/merchandise/[merchandiseId] error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { user, error } = await authorize();
  if (error) return error;

  const { merchandiseId } = await context.params;
  let body: UpdateMerchandiseRequest | null = null;

  try {
    body = (await req.json()) as UpdateMerchandiseRequest;
  } catch (err) {
    console.error("PATCH /api/merchandise/[merchandiseId] invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const item = await updateMerchandiseForMerchant(user!.merchantId, merchandiseId, body);
    return NextResponse.json(item);
  } catch (err) {
    console.error("PATCH /api/merchandise/[merchandiseId] error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      const status = err.message === "Merchandise not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
