import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { submitMerchantRegistration } from "@merchant/features/registration/api/server";
import type { SubmitMerchantRegistrationInput } from "@merchant/features/registration/model/types";

const FAILED_MESSAGE = "登録申請の処理に失敗しました。時間をおいて再度お試しください。";

export async function POST(req: Request) {
  let body: SubmitMerchantRegistrationInput | null = null;

  try {
    body = (await req.json()) as SubmitMerchantRegistrationInput;
  } catch (err) {
    console.error("POST /api/register invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const result = await submitMerchantRegistration(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/register error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      const status = err.message === "入力されたメールアドレスはすでに使用されています" ? 409 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
