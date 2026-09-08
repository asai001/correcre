import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { clearDeliveryIssueForOperator } from "@operator/features/exchange-management/api/server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

const FAILED_MESSAGE = "未着連絡の解除に失敗しました。時間をおいて再度お試しください。";

type RouteParams = {
  params: Promise<{ merchantId: string; exchangeId: string }>;
};

export async function DELETE(_req: Request, { params }: RouteParams) {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";
    return NextResponse.json({ error }, { status });
  }

  const { merchantId, exchangeId } = await params;

  try {
    const detail = await clearDeliveryIssueForOperator({ merchantId, exchangeId });
    return NextResponse.json(detail);
  } catch (err) {
    console.error(`DELETE /api/exchanges/${merchantId}/${exchangeId}/delivery-issue error`, err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
