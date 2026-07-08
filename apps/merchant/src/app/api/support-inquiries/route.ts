import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { isSupportInquiryTableMissingError } from "@correcre/lib/dynamodb/support-inquiry";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { createSupportInquiry } from "@correcre/lib/support-inquiry";
import { joinNameParts } from "@correcre/lib/user-profile";
import type { SupportInquiryCategory } from "@correcre/types";

import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "問い合わせの送信に失敗しました。時間をおいて再度お試しください。";
const CATEGORY_VALUES = new Set<SupportInquiryCategory>([
  "LOGIN",
  "ACCOUNT",
  "MERCHANDISE",
  "EXCHANGE",
  "BILLING",
  "DATA",
  "SYSTEM",
  "OTHER",
]);

async function authorize() {
  const access = await getMerchantAccessStatus();

  if (access.allowed) {
    return { user: access.user, error: null as null | NextResponse };
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "merchant_only";

  return { user: null, error: NextResponse.json({ error }, { status }) };
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseCategory(value: unknown): SupportInquiryCategory | null {
  const category = getString(value) as SupportInquiryCategory;
  return CATEGORY_VALUES.has(category) ? category : null;
}

export async function POST(req: Request) {
  const { user, error } = await authorize();
  if (error) return error;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = rawBody as { category?: unknown; subject?: unknown; body?: unknown; currentUrl?: unknown };
  const category = parseCategory(body.category);
  const subject = getString(body.subject);
  const message = getString(body.body);
  const currentUrl = getString(body.currentUrl);

  if (!category || !subject || subject.length > 120 || message.length < 10 || message.length > 4000) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const region = readRequiredServerEnv("AWS_REGION");
    const merchant = await getMerchantById(
      {
        region,
        tableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
      },
      user!.merchantId,
    );
    const merchantName = merchant?.displayName?.trim() || merchant?.name?.trim() || undefined;
    const result = await createSupportInquiry({
      source: "MERCHANT",
      category,
      subject,
      body: message,
      currentUrl,
      userAgent: req.headers.get("user-agent") ?? undefined,
      submitter: {
        userId: user!.userId,
        email: user!.email,
        name: joinNameParts(user!.lastName, user!.firstName) || undefined,
        merchantId: user!.merchantId,
        merchantName,
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/support-inquiries error", err);

    if (isSupportInquiryTableMissingError(err)) {
      return NextResponse.json(
        { error: "問い合わせテーブルが未作成です。infra のデプロイが必要です。" },
        { status: 500 },
      );
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
