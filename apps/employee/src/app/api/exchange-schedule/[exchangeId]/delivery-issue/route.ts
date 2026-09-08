import { NextResponse } from "next/server";

import { reportDeliveryIssueForEmployee } from "@employee/features/exchange-schedule/api/server";
import { mapEmployeeScheduleErrorResponse } from "@employee/features/exchange-schedule/api/route-helpers";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

const NOTE_MAX_LENGTH = 500;

type RouteParams = {
  params: Promise<{ exchangeId: string }>;
};

type ReportRequestBody = {
  note?: unknown;
};

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await requireCurrentEmployeeUser();
    const { exchangeId } = await params;

    let body: ReportRequestBody | null = null;
    try {
      body = (await req.json()) as ReportRequestBody;
    } catch {
      // 状況の記入は任意なので、ボディなしの報告も受け付ける
      body = null;
    }

    const note = typeof body?.note === "string" ? body.note.slice(0, NOTE_MAX_LENGTH) : undefined;

    const view = await reportDeliveryIssueForEmployee(user, exchangeId, note);
    return NextResponse.json(view);
  } catch (err) {
    console.error("POST /api/exchange-schedule/[exchangeId]/delivery-issue error", err);
    return mapEmployeeScheduleErrorResponse(err);
  }
}
