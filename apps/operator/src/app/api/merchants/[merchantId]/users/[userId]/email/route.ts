import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { resetMerchantUserEmailForOperator } from "@operator/features/merchant-management/api/server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

const PROVISION_FAILED_MESSAGE = "提携企業ユーザーの処理に失敗しました。時間をおいて再度お試しください。";

type RouteContext = {
  params: Promise<{ merchantId: string; userId: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";
    return NextResponse.json({ error }, { status });
  }

  const { merchantId, userId } = await context.params;

  let body: { newEmail?: string } | null = null;

  try {
    body = (await req.json()) as { newEmail?: string };
  } catch (err) {
    console.error("POST /api/merchants/[merchantId]/users/[userId]/email invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body.newEmail !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const user = await resetMerchantUserEmailForOperator(
      { merchantId, userId, newEmail: body.newEmail },
      access.user,
    );
    return NextResponse.json(user);
  } catch (err) {
    console.error("POST /api/merchants/[merchantId]/users/[userId]/email error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: PROVISION_FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      const status =
        err.message === "Merchant not found" || err.message === "対象のユーザーが見つかりません"
          ? 404
          : err.message === "同じメールアドレスのユーザーがすでに登録されています" ||
              err.message === "同じメールアドレスの Cognito ユーザーが既に存在します"
            ? 409
            : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
