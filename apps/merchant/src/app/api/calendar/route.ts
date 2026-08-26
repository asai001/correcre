import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import {
  getCalendarForMerchant,
  InvalidCalendarInputError,
  updateCalendarForMerchant,
} from "@merchant/features/calendar/api/server";
import type { UpdateMerchantCalendarRequest } from "@merchant/features/calendar/model/types";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "休業日カレンダーの更新に失敗しました。時間をおいて再度お試しください。";

async function authorize() {
  const access = await getMerchantAccessStatus();

  if (access.allowed) {
    return { user: access.user, error: null as null | NextResponse };
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "merchant_only";

  return { user: null, error: NextResponse.json({ error }, { status }) };
}

export async function GET() {
  const { user, error } = await authorize();
  if (error) return error;

  try {
    const calendar = await getCalendarForMerchant(user!.merchantId);
    return NextResponse.json(calendar);
  } catch (err) {
    console.error("GET /api/calendar error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { user, error } = await authorize();
  if (error) return error;

  let body: UpdateMerchantCalendarRequest | null = null;

  try {
    body = (await req.json()) as UpdateMerchantCalendarRequest;
  } catch (err) {
    console.error("PUT /api/calendar invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const calendar = await updateCalendarForMerchant(user!.merchantId, body);
    return NextResponse.json(calendar);
  } catch (err) {
    console.error("PUT /api/calendar error", err);

    if (err instanceof InvalidCalendarInputError) {
      return NextResponse.json({ error: "invalid_calendar", message: err.message }, { status: 400 });
    }

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
