import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import {
  createMerchantForOperator,
  listMerchantsForOperator,
  updateMerchantForOperator,
} from "@operator/features/merchant-management/api/server";
import type {
  CreateMerchantInput,
  UpdateMerchantInput,
} from "@operator/features/merchant-management/model/types";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

const PROVISION_FAILED_MESSAGE = "提携企業の処理に失敗しました。時間をおいて再度お試しください。";

async function authorizeOperator() {
  const access = await getOperatorAccessStatus();

  if (access.allowed) {
    return null;
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";

  return NextResponse.json({ error }, { status });
}

export async function GET() {
  const unauthorized = await authorizeOperator();
  if (unauthorized) return unauthorized;

  try {
    const merchants = await listMerchantsForOperator();
    return NextResponse.json(merchants);
  } catch (err) {
    console.error("GET /api/merchants error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: PROVISION_FAILED_MESSAGE }, { status: 500 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) return unauthorized;

  let body: CreateMerchantInput | null = null;

  try {
    body = (await req.json()) as CreateMerchantInput;
  } catch (err) {
    console.error("POST /api/merchants invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const merchant = await createMerchantForOperator(body);
    return NextResponse.json(merchant, { status: 201 });
  } catch (err) {
    console.error("POST /api/merchants error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: PROVISION_FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) return unauthorized;

  let body: UpdateMerchantInput | null = null;

  try {
    body = (await req.json()) as UpdateMerchantInput;
  } catch (err) {
    console.error("PATCH /api/merchants invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.merchantId) {
    return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
  }

  try {
    const merchant = await updateMerchantForOperator(body);
    return NextResponse.json(merchant);
  } catch (err) {
    console.error("PATCH /api/merchants error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: PROVISION_FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      const status = err.message === "Merchant not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
