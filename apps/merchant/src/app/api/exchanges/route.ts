import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import type { ExchangeHistoryStatus } from "@correcre/types";

import { listExchangesForMerchant } from "@merchant/features/exchanges/api/server";
import type { ExchangeListFilter } from "@merchant/features/exchanges/model/types";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "交換情報の取得に失敗しました。時間をおいて再度お試しください。";

const ALLOWED_STATUSES: ReadonlyArray<ExchangeHistoryStatus> = [
  "REQUESTED",
  "PREPARING",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
  "CANCELED",
  "CANCELLED",
];

function parseFilter(value: string | null): ExchangeListFilter {
  if (!value || value === "ALL") return "ALL";
  if ((ALLOWED_STATUSES as ReadonlyArray<string>).includes(value)) {
    return value as ExchangeListFilter;
  }
  return "ALL";
}

async function authorize() {
  const access = await getMerchantAccessStatus();

  if (access.allowed) {
    return { user: access.user, error: null as null | NextResponse };
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "merchant_only";

  return { user: null, error: NextResponse.json({ error }, { status }) };
}

export async function GET(req: Request) {
  const { user, error } = await authorize();
  if (error) return error;

  const filter = parseFilter(new URL(req.url).searchParams.get("status"));

  try {
    const items = await listExchangesForMerchant(user!.merchantId, filter);
    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/exchanges error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
