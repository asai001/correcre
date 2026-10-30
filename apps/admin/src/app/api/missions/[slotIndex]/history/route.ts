import { NextResponse } from "next/server";

import { listMissionHistoryForSlot } from "@correcre/mission-management/server";

import { authorizeEmployeeManagementRequest } from "../../../employee-management/authorize";
import { invalidSlotIndexResponse, missionErrorResponse, parseSlotIndex } from "../../respond";

// GET /api/missions/:slotIndex/history
// 自社ミッションの編集履歴（版ごとの内容と変更者）を返す。
export async function GET(_req: Request, { params }: { params: Promise<{ slotIndex: string }> }) {
  const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
  if (unauthorized || !currentAdminUser) {
    return unauthorized;
  }

  const { slotIndex: slotIndexParam } = await params;
  const slotIndex = parseSlotIndex(slotIndexParam);

  if (slotIndex === null) {
    return invalidSlotIndexResponse();
  }

  try {
    const history = await listMissionHistoryForSlot(currentAdminUser.companyId, slotIndex);
    return NextResponse.json(history);
  } catch (err) {
    return missionErrorResponse(err, `GET /api/missions/${slotIndex}/history`);
  }
}
