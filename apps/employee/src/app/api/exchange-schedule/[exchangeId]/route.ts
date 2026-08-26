import { NextResponse } from "next/server";

import { getScheduleForEmployee } from "@employee/features/exchange-schedule/api/server";
import { mapEmployeeScheduleErrorResponse } from "@employee/features/exchange-schedule/api/route-helpers";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ exchangeId: string }>;
};

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const user = await requireCurrentEmployeeUser();
    const { exchangeId } = await params;

    const view = await getScheduleForEmployee(user, exchangeId);
    return NextResponse.json(view);
  } catch (err) {
    console.error("GET /api/exchange-schedule/[exchangeId] error", err);
    return mapEmployeeScheduleErrorResponse(err);
  }
}
