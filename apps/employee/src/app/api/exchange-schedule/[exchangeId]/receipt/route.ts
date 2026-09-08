import { NextResponse } from "next/server";

import { confirmReceiptForEmployee } from "@employee/features/exchange-schedule/api/server";
import { mapEmployeeScheduleErrorResponse } from "@employee/features/exchange-schedule/api/route-helpers";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ exchangeId: string }>;
};

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const user = await requireCurrentEmployeeUser();
    const { exchangeId } = await params;

    const view = await confirmReceiptForEmployee(user, exchangeId);
    return NextResponse.json(view);
  } catch (err) {
    console.error("POST /api/exchange-schedule/[exchangeId]/receipt error", err);
    return mapEmployeeScheduleErrorResponse(err);
  }
}
