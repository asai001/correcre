import { NextResponse } from "next/server";

import { respondScheduleForMerchant } from "@merchant/features/exchanges/api/server";
import {
  mapScheduleErrorResponse,
  parseArrivalDates,
} from "@merchant/features/exchanges/api/schedule-route-helpers";
import type { RespondScheduleRequest } from "@merchant/features/exchanges/model/types";
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

function parseRespondRequest(body: unknown): RespondScheduleRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const { action } = body as { action?: unknown };

  if (action === "ACCEPT") {
    return { action: "ACCEPT" };
  }

  if (action === "REJECT") {
    const reason = (body as { reason?: unknown }).reason;
    if (typeof reason !== "string" || !reason.trim()) {
      return null;
    }
    return { action: "REJECT", reason };
  }

  if (action === "REPROPOSE") {
    const arrivalDates = parseArrivalDates((body as { arrivalDates?: unknown }).arrivalDates);
    if (!arrivalDates || arrivalDates.length === 0) {
      return null;
    }
    const merchantNote = (body as { merchantNote?: unknown }).merchantNote;
    return {
      action: "REPROPOSE",
      arrivalDates,
      merchantNote: typeof merchantNote === "string" ? merchantNote : undefined,
    };
  }

  return null;
}

type RouteParams = {
  params: Promise<{ exchangeId: string }>;
};

export async function POST(req: Request, { params }: RouteParams) {
  const { user, error } = await authorize();
  if (error) return error;

  const { exchangeId } = await params;

  let body: unknown = null;

  try {
    body = await req.json();
  } catch (err) {
    console.error(`POST /api/exchanges/${exchangeId}/schedule/respond invalid json`, err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const request = parseRespondRequest(body);
  if (!request) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const detail = await respondScheduleForMerchant({
      merchantId: user!.merchantId,
      exchangeId,
      request,
      actor: { actorUserId: user!.userId, actorName: getMerchantViewerName(user!) },
    });

    return NextResponse.json(detail);
  } catch (err) {
    console.error(`POST /api/exchanges/${exchangeId}/schedule/respond error`, err);
    return mapScheduleErrorResponse(err);
  }
}
