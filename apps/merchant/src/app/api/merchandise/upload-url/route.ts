import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { createMerchandiseUploadUrl } from "@merchant/features/merchandise/api/server";
import type { RequestUploadUrlRequest } from "@merchant/features/merchandise/model/types";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

async function authorize() {
  const access = await getMerchantAccessStatus();

  if (access.allowed) {
    return { user: access.user, error: null as null | NextResponse };
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "merchant_only";

  return { user: null, error: NextResponse.json({ error }, { status }) };
}

export async function POST(req: Request) {
  const { user, error } = await authorize();
  if (error) return error;

  let body: RequestUploadUrlRequest | null = null;

  try {
    body = (await req.json()) as RequestUploadUrlRequest;
  } catch (err) {
    console.error("POST /api/merchandise/upload-url invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const result = await createMerchandiseUploadUrl(user!.merchantId, body.contentType, body.contentLength);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/merchandise/upload-url error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
