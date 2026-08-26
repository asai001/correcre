import { NextResponse } from "next/server";

import { requestDateForEmployee } from "@employee/features/exchange-schedule/api/server";
import { mapEmployeeScheduleErrorResponse } from "@employee/features/exchange-schedule/api/route-helpers";
import type { RequestDateRequest } from "@employee/features/exchange-schedule/model/types";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ exchangeId: string }>;
};

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await requireCurrentEmployeeUser();
    const { exchangeId } = await params;

    let body: RequestDateRequest | null = null;
    try {
      body = (await req.json()) as RequestDateRequest;
    } catch (err) {
      console.error("POST /api/exchange-schedule/[exchangeId]/request-date invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!body || typeof body.requestedArrivalDate !== "string" || !body.requestedArrivalDate) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const view = await requestDateForEmployee(user, exchangeId, body);
    return NextResponse.json(view);
  } catch (err) {
    console.error("POST /api/exchange-schedule/[exchangeId]/request-date error", err);
    return mapEmployeeScheduleErrorResponse(err);
  }
}
