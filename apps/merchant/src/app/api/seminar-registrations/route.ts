import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import {
  SeminarNotConfiguredError,
  SeminarRegistrationValidationError,
  submitSeminarRegistration,
} from "@merchant/features/seminar/api/server";
import type { SubmitSeminarRegistrationInput } from "@merchant/features/seminar/model/types";
import { consumeRateLimit, getClientIp } from "@merchant/lib/rate-limit";

const FAILED_MESSAGE = "お申し込みの送信に失敗しました。時間をおいて再度お試しください。";
const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

export async function POST(req: Request) {
  if (!consumeRateLimit(`seminar:${getClientIp(req)}`, RATE_LIMIT)) {
    return NextResponse.json(
      { error: "お申し込みが集中しています。しばらく時間をおいて再度お試しください。" },
      { status: 429 },
    );
  }

  let body: SubmitSeminarRegistrationInput | null = null;

  try {
    body = (await req.json()) as SubmitSeminarRegistrationInput;
  } catch (err) {
    console.error("POST /api/seminar-registrations invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // ハニーポット。人間には見えない項目なので、値が入っていれば bot とみなして黙って捨てる。
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ error: FAILED_MESSAGE }, { status: 400 });
  }

  try {
    const result = await submitSeminarRegistration(body, {
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/seminar-registrations error", err);

    if (err instanceof SeminarRegistrationValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (err instanceof SeminarNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
  }
}
