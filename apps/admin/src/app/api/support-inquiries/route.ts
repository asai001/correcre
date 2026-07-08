import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { isSupportInquiryTableMissingError } from "@correcre/lib/dynamodb/support-inquiry";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { createSupportInquiry } from "@correcre/lib/support-inquiry";
import { joinNameParts } from "@correcre/lib/user-profile";
import type { SupportInquiryCategory } from "@correcre/types";

import { authorizeEmployeeManagementRequest } from "../employee-management/authorize";

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

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseCategory(value: unknown): SupportInquiryCategory | null {
  const category = getString(value) as SupportInquiryCategory;
  return CATEGORY_VALUES.has(category) ? category : null;
}

export async function POST(req: Request) {
  const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
  if (unauthorized || !currentAdminUser) {
    return unauthorized;
  }

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
    const company = await getCompanyById(
      {
        region,
        tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
      },
      currentAdminUser.companyId,
    );
    const result = await createSupportInquiry({
      source: "ADMIN",
      category,
      subject,
      body: message,
      currentUrl,
      userAgent: req.headers.get("user-agent") ?? undefined,
      submitter: {
        userId: currentAdminUser.userId,
        email: currentAdminUser.email,
        name: joinNameParts(currentAdminUser.lastName, currentAdminUser.firstName) || undefined,
        companyId: currentAdminUser.companyId,
        companyName: company?.shortName?.trim() || company?.name?.trim() || undefined,
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
