import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { rejectMerchantApplicationForOperator } from "@operator/features/merchant-management/api/server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

const PROVISION_FAILED_MESSAGE = "提携企業申請の処理に失敗しました。時間をおいて再度お試しください。";

type RouteContext = {
  params: Promise<{ merchantId: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";
    return NextResponse.json({ error }, { status });
  }

  const { merchantId } = await context.params;

  try {
    const merchant = await rejectMerchantApplicationForOperator({ merchantId }, access.user);
    return NextResponse.json(merchant);
  } catch (err) {
    console.error("POST /api/merchants/[merchantId]/reject error", err);

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
