import { NextResponse } from "next/server";

import { CandidateNotSelectableError } from "@correcre/lib/schedule/service";

import {
  getScheduleForEmployee,
  selectCandidateForEmployee,
} from "@employee/features/exchange-schedule/api/server";
import { mapEmployeeScheduleErrorResponse } from "@employee/features/exchange-schedule/api/route-helpers";
import type { SelectCandidateRequest } from "@employee/features/exchange-schedule/model/types";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ exchangeId: string }>;
};

export async function POST(req: Request, { params }: RouteParams) {
  let exchangeId = "";
  try {
    const user = await requireCurrentEmployeeUser();
    ({ exchangeId } = await params);

    let body: SelectCandidateRequest | null = null;
    try {
      body = (await req.json()) as SelectCandidateRequest;
    } catch (err) {
      console.error("POST /api/exchange-schedule/[exchangeId]/select invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!body || typeof body.arrivalDate !== "string" || !body.arrivalDate) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const view = await selectCandidateForEmployee(user, exchangeId, body);
    return NextResponse.json(view);
  } catch (err) {
    console.error("POST /api/exchange-schedule/[exchangeId]/select error", err);

    // 「選択された日は受付を終了しました」— 最新の候補で再描画できるよう最新ビューを添えて返す
    if (err instanceof CandidateNotSelectableError) {
      try {
        const user = await requireCurrentEmployeeUser();
        const latest = await getScheduleForEmployee(user, exchangeId);
        return NextResponse.json(
          { error: "candidate_expired", message: err.message, latest },
          { status: 409 },
        );
      } catch {
        // 最新ビューの取得に失敗した場合は通常のエラー応答にフォールバック
      }
    }

    return mapEmployeeScheduleErrorResponse(err);
  }
}
