import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { inviteOwnMerchantUser, listOwnMerchantUsers } from "@merchant/features/user-management";
import type { InviteMerchantUserInput } from "@merchant/features/user-management";
import { getMerchantAccessStatus, isMerchantAdminUser } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "ユーザーの処理に失敗しました。時間をおいて再度お試しください。";

// ユーザーの追加・一覧は管理者ロール（MERCHANT_ADMIN）のみ許可する。
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

export async function GET() {
  const { user, error } = await authorizeAdmin();
  if (error) return error;

  try {
    const users = await listOwnMerchantUsers(user!.merchantId);
    return NextResponse.json(users);
  } catch (err) {
    console.error("GET /api/users error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, error } = await authorizeAdmin();
  if (error) return error;

  let body: InviteMerchantUserInput | null = null;

  try {
    body = (await req.json()) as InviteMerchantUserInput;
  } catch (err) {
    console.error("POST /api/users invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    // 所属企業はログイン中ユーザーから解決する（ボディの値は使わない）。
    const created = await inviteOwnMerchantUser(user!.merchantId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/users error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      const status = err.message === "Merchant not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
