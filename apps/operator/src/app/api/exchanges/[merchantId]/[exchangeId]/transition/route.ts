import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { InvalidExchangeStatusTransitionError } from "@correcre/lib/dynamodb/exchange-history";
import type { ExchangeHistoryStatus } from "@correcre/types";

import { transitionExchangeForOperator } from "@operator/features/exchange-management/api/server";
import type { TransitionOperatorExchangeRequest } from "@operator/features/exchange-management/model/types";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

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

type RouteParams = {
  params: Promise<{ merchantId: string; exchangeId: string }>;
};

export async function POST(req: Request, { params }: RouteParams) {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";
    return NextResponse.json({ error }, { status });
  }

  const { merchantId, exchangeId } = await params;

  let body: TransitionOperatorExchangeRequest | null = null;
  try {
    body = (await req.json()) as TransitionOperatorExchangeRequest;
  } catch (err) {
    console.error(`POST /api/exchanges/${merchantId}/${exchangeId}/transition invalid json`, err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || !isAllowedStatus(body.nextStatus)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const detail = await transitionExchangeForOperator({
      merchantId,
      exchangeId,
      actorUserId: access.user.userId,
      nextStatus: body.nextStatus,
      comment: body.comment,
    });

    return NextResponse.json(detail);
  } catch (err) {
    console.error(`POST /api/exchanges/${merchantId}/${exchangeId}/transition error`, err);

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
