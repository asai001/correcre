import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import {
  createMerchandiseForMerchant,
  listMerchandiseForMerchant,
} from "@merchant/features/merchandise/api/server";
import type { CreateMerchandiseRequest } from "@merchant/features/merchandise/model/types";
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

export async function GET() {
  const { user, error } = await authorize();
  if (error) return error;

  try {
    const items = await listMerchandiseForMerchant(user!.merchantId);
    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/merchandise error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, error } = await authorize();
  if (error) return error;

  let body: CreateMerchandiseRequest | null = null;

  try {
    body = (await req.json()) as CreateMerchandiseRequest;
  } catch (err) {
    console.error("POST /api/merchandise invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const item = await createMerchandiseForMerchant(user!.merchantId, body);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("POST /api/merchandise error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
