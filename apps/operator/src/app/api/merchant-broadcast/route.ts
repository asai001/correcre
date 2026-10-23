import { NextResponse } from "next/server";

import {
  MERCHANT_BROADCAST_BODY_MAX_LENGTH,
  MERCHANT_BROADCAST_MAX_RECIPIENTS,
  MERCHANT_BROADCAST_SUBJECT_MAX_LENGTH,
} from "@correcre/lib/merchant-broadcast";

import { MerchantBroadcastInputError, sendMerchantBroadcast } from "@operator/features/merchant-broadcast/api/server";
import type {
  MerchantBroadcastMode,
  MerchantBroadcastSelection,
} from "@operator/features/merchant-broadcast/model/types";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

// 宛先ごとに 1 通ずつ送るため、件数が多いと時間がかかる
export const maxDuration = 60;

const FAILED_MESSAGE = "メールの送信に失敗しました。時間をおいて再度お試しください。";

// [{ merchantId, emails: string[] }] の形でなければ null。宛先が 1 件もない提携企業は除く。
function parseSelections(value: unknown): MerchantBroadcastSelection[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const selections: MerchantBroadcastSelection[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const { merchantId, emails } = item as { merchantId?: unknown; emails?: unknown };
    if (typeof merchantId !== "string" || !Array.isArray(emails) || emails.some((email) => typeof email !== "string")) {
      return null;
    }

    const normalizedEmails = [
      ...new Set((emails as string[]).map((email) => email.trim().toLowerCase()).filter(Boolean)),
    ];
    if (merchantId.trim() && normalizedEmails.length) {
      selections.push({ merchantId: merchantId.trim(), emails: normalizedEmails });
    }
  }

  return selections;
}

export async function POST(req: Request) {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";
    return NextResponse.json({ error }, { status });
  }

  let body: { mode?: unknown; subject?: unknown; body?: unknown; selections?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== "test" && mode !== "send") {
    return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.body === "string" ? body.body : "";
  const selections = parseSelections(body.selections);

  if (!subject) {
    return NextResponse.json({ error: "件名を入力してください。" }, { status: 400 });
  }
  if (subject.length > MERCHANT_BROADCAST_SUBJECT_MAX_LENGTH) {
    return NextResponse.json(
      { error: `件名は${MERCHANT_BROADCAST_SUBJECT_MAX_LENGTH}文字以内で入力してください。` },
      { status: 400 },
    );
  }
  if (!text.trim()) {
    return NextResponse.json({ error: "本文を入力してください。" }, { status: 400 });
  }
  if (text.length > MERCHANT_BROADCAST_BODY_MAX_LENGTH) {
    return NextResponse.json(
      { error: `本文は${MERCHANT_BROADCAST_BODY_MAX_LENGTH}文字以内で入力してください。` },
      { status: 400 },
    );
  }
  if (!selections) {
    return NextResponse.json({ error: "invalid_selections" }, { status: 400 });
  }
  if (!selections.length) {
    return NextResponse.json({ error: "送信先を選択してください。" }, { status: 400 });
  }

  try {
    const result = await sendMerchantBroadcast(
      access.user,
      { mode: mode as MerchantBroadcastMode, subject, body: text, selections },
      { maxRecipients: MERCHANT_BROADCAST_MAX_RECIPIENTS },
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof MerchantBroadcastInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/merchant-broadcast error", err);
    return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
  }
}
