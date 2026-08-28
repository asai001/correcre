import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import type { ProductFulfillment } from "@correcre/types";

import { previewScheduleForMerchandise } from "@merchant/features/merchandise/api/server";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "お届け日の確認に失敗しました。時間をおいて再度お試しください。";

async function authorize() {
  const access = await getMerchantAccessStatus();

  if (access.allowed) {
    return { user: access.user, error: null as null | NextResponse };
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "merchant_only";

  return { user: null, error: NextResponse.json({ error }, { status }) };
}

export async function POST(req: Request) {
  const { user, error } = await authorize();
  if (error) return error;

  let body: { fulfillment?: ProductFulfillment } | null = null;

  try {
    body = (await req.json()) as { fulfillment?: ProductFulfillment };
  } catch (err) {
    console.error("POST /api/merchandise/schedule-preview invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.fulfillment) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const preview = await previewScheduleForMerchandise(user!.merchantId, body.fulfillment);
    return NextResponse.json(preview);
  } catch (err) {
    // 入力途中の値では検証エラーになるのが普通なので、理由をそのまま案内に使う
    if (err instanceof Error && !isAwsCredentialError(err)) {
      return NextResponse.json({ candidates: [], note: err.message });
    }

    console.error("POST /api/merchandise/schedule-preview error", err);
    return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
  }
}
