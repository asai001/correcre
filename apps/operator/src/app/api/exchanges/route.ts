import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import type { ExchangeHistoryStatus } from "@correcre/types";

import { listExchangesForOperator } from "@operator/features/exchange-management/api/server";
import type { OperatorExchangeFilter } from "@operator/features/exchange-management/model/types";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

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

function parseFilter(value: string | null): OperatorExchangeFilter {
  if (!value || value === "ALL") return "ALL";
  if ((ALLOWED_STATUSES as ReadonlyArray<string>).includes(value)) {
    return value as OperatorExchangeFilter;
  }
  return "ALL";
}

async function authorizeOperator() {
  const access = await getOperatorAccessStatus();

  if (access.allowed) {
    return null;
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";

  return NextResponse.json({ error }, { status });
}

export async function GET(req: Request) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const filter = parseFilter(url.searchParams.get("status"));
  const merchantId = url.searchParams.get("merchantId") ?? undefined;

  try {
    const items = await listExchangesForOperator(filter, merchantId || undefined);
    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/exchanges error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
