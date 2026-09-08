import { NextResponse } from "next/server";

import { proposeScheduleForMerchant } from "@merchant/features/exchanges/api/server";
import {
  mapScheduleErrorResponse,
  parseArrivalDates,
} from "@merchant/features/exchanges/api/schedule-route-helpers";
import type { ProposeScheduleRequest } from "@merchant/features/exchanges/model/types";
import { getMerchantAccessStatus, getMerchantViewerName } from "@merchant/lib/auth/merchant";

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

  let body: ProposeScheduleRequest | null = null;

  try {
    body = (await req.json()) as ProposeScheduleRequest;
  } catch (err) {
    console.error(`POST /api/exchanges/${exchangeId}/schedule/propose invalid json`, err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const arrivalDates = parseArrivalDates(body?.arrivalDates);
  if (!arrivalDates || arrivalDates.length === 0) {
    return NextResponse.json(
      { error: "empty_candidates", message: "候補日を追加してください。" },
      { status: 400 },
    );
  }

  try {
    const detail = await proposeScheduleForMerchant({
      merchantId: user!.merchantId,
      exchangeId,
      arrivalDates,
      merchantNote: typeof body?.merchantNote === "string" ? body.merchantNote : undefined,
      actor: { actorUserId: user!.userId, actorName: getMerchantViewerName(user!) },
    });

    return NextResponse.json(detail);
  } catch (err) {
    console.error(`POST /api/exchanges/${exchangeId}/schedule/propose error`, err);
    return mapScheduleErrorResponse(err);
  }
}
