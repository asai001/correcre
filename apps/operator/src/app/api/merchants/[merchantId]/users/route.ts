import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import {
  createMerchantUserForOperator,
  listMerchantUsersForOperator,
} from "@operator/features/merchant-management/api/server";
import type { CreateMerchantUserInput } from "@operator/features/merchant-management/model/types";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

const PROVISION_FAILED_MESSAGE = "提携企業ユーザーの処理に失敗しました。時間をおいて再度お試しください。";

async function authorizeOperator() {
  const access = await getOperatorAccessStatus();

  if (access.allowed) {
    return null;
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";

  return NextResponse.json({ error }, { status });
}

type RouteContext = {
  params: Promise<{ merchantId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) return unauthorized;

  const { merchantId } = await context.params;

  try {
    const users = await listMerchantUsersForOperator(merchantId);
    return NextResponse.json(users);
  } catch (err) {
    console.error("GET /api/merchants/[merchantId]/users error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: PROVISION_FAILED_MESSAGE }, { status: 500 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: Request, context: RouteContext) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) return unauthorized;

  const { merchantId } = await context.params;

  let body: Omit<CreateMerchantUserInput, "merchantId"> | null = null;

  try {
    body = (await req.json()) as Omit<CreateMerchantUserInput, "merchantId">;
  } catch (err) {
    console.error("POST /api/merchants/[merchantId]/users invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const user = await createMerchantUserForOperator({ ...body, merchantId });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("POST /api/merchants/[merchantId]/users error", err);

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
