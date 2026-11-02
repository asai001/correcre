import { NextResponse } from "next/server";

import { cancelScheduledMissionChange } from "@correcre/mission-management/server";

import { authorizeEmployeeManagementRequest } from "../../../employee-management/authorize";
import { invalidSlotIndexResponse, missionErrorResponse, parseSlotIndex } from "../../respond";

// DELETE /api/missions/:slotIndex/scheduled
// 自社ミッションの「翌月月初から反映」予約(pendingChange)を取り消す。
export async function DELETE(_req: Request, { params }: { params: Promise<{ slotIndex: string }> }) {
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
    const updated = await cancelScheduledMissionChange(currentAdminUser.companyId, slotIndex);
    return NextResponse.json(updated);
  } catch (err) {
    return missionErrorResponse(err, `DELETE /api/missions/${slotIndex}/scheduled`);
  }
}
