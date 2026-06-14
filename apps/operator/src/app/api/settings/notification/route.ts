import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { isSystemSettingTableMissingError } from "@correcre/lib/dynamodb/system-setting";

import { updateOperatorNotificationEmails } from "@operator/features/notification-settings/api/server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

const FAILED_MESSAGE = "通知設定の保存に失敗しました。時間をおいて再度お試しください。";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 20;

export async function PUT(req: Request) {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";
    return NextResponse.json({ error }, { status });
  }

  let rawEmails: unknown;
  try {
    const body = (await req.json()) as { operatorNotificationEmails?: unknown };
    rawEmails = body.operatorNotificationEmails;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!Array.isArray(rawEmails) || rawEmails.some((value) => typeof value !== "string")) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // 空配列は「未設定に戻す」として許可する。
  const emails = [...new Set((rawEmails as string[]).map((value) => value.trim().toLowerCase()).filter(Boolean))];

  const invalid = emails.find((email) => !EMAIL_PATTERN.test(email));
  if (invalid) {
    return NextResponse.json(
      { error: `メールアドレスの形式が正しくありません: ${invalid}` },
      { status: 400 },
    );
  }

  if (emails.length > MAX_EMAILS) {
    return NextResponse.json(
      { error: `登録できるメールアドレスは${MAX_EMAILS}件までです。` },
      { status: 400 },
    );
  }

  try {
    const saved = await updateOperatorNotificationEmails({
      operatorNotificationEmails: emails,
      updatedBy: access.user.userId,
    });
    return NextResponse.json(saved);
  } catch (err) {
    console.error("PUT /api/settings/notification error", err);
    if (isSystemSettingTableMissingError(err)) {
      return NextResponse.json(
        { error: "設定テーブルが未作成です。infra のデプロイ（system-setting テーブルの作成）が必要です。" },
        { status: 500 },
      );
    }
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
