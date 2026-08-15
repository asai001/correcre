import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { updateMerchantCompanyInfo } from "@merchant/features/company-info";
import type { UpdateMerchantCompanyInfoInput } from "@merchant/features/company-info";
import { getMerchantAccessStatus, isMerchantAdminUser } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "会社情報の処理に失敗しました。時間をおいて再度お試しください。";

// 会社情報の更新は管理者ロール（MERCHANT_ADMIN）のみ許可する。
async function authorizeAdmin() {
  const access = await getMerchantAccessStatus();

  if (access.allowed && isMerchantAdminUser(access.user)) {
    return { user: access.user, error: null as null | NextResponse };
  }

  if (!access.allowed && access.reason === "unauthenticated") {
    return { user: null, error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  return { user: null, error: NextResponse.json({ error: "admin_only" }, { status: 403 }) };
}

export async function PATCH(req: Request) {
  const { user, error } = await authorizeAdmin();
  if (error) return error;

  let body: UpdateMerchantCompanyInfoInput | null = null;

  try {
    body = (await req.json()) as UpdateMerchantCompanyInfoInput;
  } catch (err) {
    console.error("PATCH /api/company-info invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const updated = await updateMerchantCompanyInfo(user!.merchantId, body);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/company-info error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
