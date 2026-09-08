import { NextResponse } from "next/server";

import { cancelScheduleForEmployee } from "@employee/features/exchange-schedule/api/server";
import { mapEmployeeScheduleErrorResponse } from "@employee/features/exchange-schedule/api/route-helpers";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ exchangeId: string }>;
};

type CancelRequestBody = {
  reason?: unknown;
};

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await requireCurrentEmployeeUser();
    const { exchangeId } = await params;

    let body: CancelRequestBody | null = null;
    try {
      body = (await req.json()) as CancelRequestBody;
    } catch {
      // ボディなしのキャンセルも許容する
      body = null;
    }

    const reason = typeof body?.reason === "string" ? body.reason : undefined;

    const view = await cancelScheduleForEmployee(user, exchangeId, reason);
    return NextResponse.json(view);
  } catch (err) {
    console.error("POST /api/exchange-schedule/[exchangeId]/cancel error", err);
    return mapEmployeeScheduleErrorResponse(err);
  }
}
