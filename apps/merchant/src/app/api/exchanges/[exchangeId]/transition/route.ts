import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { InvalidExchangeStatusTransitionError } from "@correcre/lib/dynamodb/exchange-history";
import type { ExchangeHistoryStatus } from "@correcre/types";

import { transitionExchangeForMerchant } from "@merchant/features/exchanges/api/server";
import type { TransitionExchangeRequest } from "@merchant/features/exchanges/model/types";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "交換情報の更新に失敗しました。時間をおいて再度お試しください。";

const ALLOWED_STATUSES: ReadonlyArray<ExchangeHistoryStatus> = [
  "REQUESTED",
  "PREPARING",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
  "CANCELED",
];

function isAllowedStatus(value: unknown): value is ExchangeHistoryStatus {
  return typeof value === "string" && (ALLOWED_STATUSES as ReadonlyArray<string>).includes(value);
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

type RouteParams = {
  params: Promise<{ exchangeId: string }>;
};

export async function POST(req: Request, { params }: RouteParams) {
  const { user, error } = await authorize();
  if (error) return error;

  const { exchangeId } = await params;

  let body: TransitionExchangeRequest | null = null;

  try {
    body = (await req.json()) as TransitionExchangeRequest;
  } catch (err) {
    console.error(`POST /api/exchanges/${exchangeId}/transition invalid json`, err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || !isAllowedStatus(body.nextStatus)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const detail = await transitionExchangeForMerchant({
      merchantId: user!.merchantId,
      exchangeId,
      actorUserId: user!.userId,
      nextStatus: body.nextStatus,
      comment: body.comment,
    });

    return NextResponse.json(detail);
  } catch (err) {
    console.error(`POST /api/exchanges/${exchangeId}/transition error`, err);

    if (err instanceof InvalidExchangeStatusTransitionError) {
      return NextResponse.json({ error: "invalid_transition" }, { status: 400 });
    }

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
