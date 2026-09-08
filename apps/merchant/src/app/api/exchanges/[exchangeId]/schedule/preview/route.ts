import { NextResponse } from "next/server";

import { previewScheduleForMerchant } from "@merchant/features/exchanges/api/server";
import {
  mapScheduleErrorResponse,
  parseArrivalDates,
} from "@merchant/features/exchanges/api/schedule-route-helpers";
import type { PreviewScheduleRequest } from "@merchant/features/exchanges/model/types";
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

type RouteParams = {
  params: Promise<{ exchangeId: string }>;
};

export async function POST(req: Request, { params }: RouteParams) {
  const { user, error } = await authorize();
  if (error) return error;

  const { exchangeId } = await params;

  let body: PreviewScheduleRequest | null = null;

  try {
    body = (await req.json()) as PreviewScheduleRequest;
  } catch (err) {
    console.error(`POST /api/exchanges/${exchangeId}/schedule/preview invalid json`, err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const arrivalDates = parseArrivalDates(body?.arrivalDates);
  if (!arrivalDates) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const candidates = await previewScheduleForMerchant({
      merchantId: user!.merchantId,
      exchangeId,
      arrivalDates,
    });

    return NextResponse.json({ candidates });
  } catch (err) {
    console.error(`POST /api/exchanges/${exchangeId}/schedule/preview error`, err);
    return mapScheduleErrorResponse(err);
  }
}
