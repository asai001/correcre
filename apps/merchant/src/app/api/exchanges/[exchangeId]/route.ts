import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { getExchangeDetailForMerchant } from "@merchant/features/exchanges/api/server";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "交換情報の取得に失敗しました。時間をおいて再度お試しください。";

async function authorize() {
  const access = await getMerchantAccessStatus();

  if (access.allowed) {
    return { user: access.user, error: null as null | NextResponse };
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "merchant_only";

  return { user: null, error: NextResponse.json({ error }, { status }) };
}

type RouteParams = {
  params: Promise<{ exchangeId: string }>;
};

export async function GET(_req: Request, { params }: RouteParams) {
  const { user, error } = await authorize();
  if (error) return error;

  const { exchangeId } = await params;

  try {
    const detail = await getExchangeDetailForMerchant(user!.merchantId, exchangeId);
    if (!detail) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    console.error(`GET /api/exchanges/${exchangeId} error`, err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
