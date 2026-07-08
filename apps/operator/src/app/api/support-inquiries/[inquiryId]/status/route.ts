import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { isSupportInquiryTableMissingError } from "@correcre/lib/dynamodb/support-inquiry";
import type { SupportInquiryStatus } from "@correcre/types";

import { updateSupportInquiryStatusForOperator } from "@operator/features/support-inquiries";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

const STATUS_VALUES = new Set<SupportInquiryStatus>(["OPEN", "IN_PROGRESS", "RESOLVED"]);

type RouteContext = {
  params: Promise<{ inquiryId: string }>;
};

function parseStatus(value: unknown): SupportInquiryStatus | null {
  const status = typeof value === "string" ? (value as SupportInquiryStatus) : null;
  return status && STATUS_VALUES.has(status) ? status : null;
}

export async function PUT(req: Request, context: RouteContext) {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";
    return NextResponse.json({ error }, { status });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const status = parseStatus((rawBody as { status?: unknown }).status);
  if (!status) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { inquiryId } = await context.params;

  try {
    const updated = await updateSupportInquiryStatusForOperator(inquiryId, status, access.user);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/support-inquiries/[inquiryId]/status error", err);

    if (isSupportInquiryTableMissingError(err)) {
      return NextResponse.json(
        { error: "問い合わせテーブルが未作成です。infra のデプロイが必要です。" },
        { status: 500 },
      );
    }

    if (isAwsCredentialError(err)) {
      return NextResponse.json(
        { error: "問い合わせの対応状況を更新できませんでした。時間をおいて再度お試しください。" },
        { status: 500 },
      );
    }

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: err.message.includes("not set") ? 500 : 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
