import { NextResponse } from "next/server";

import { listMissionsForCompany } from "@correcre/mission-management/server";

import { authorizeEmployeeManagementRequest } from "../employee-management/authorize";
import { missionErrorResponse } from "./respond";

// GET /api/missions
// 対象企業はセッションの管理者が所属する企業に固定する。クエリの companyId は受け付けない
// （運用者の同名 API と違い、他社のミッションを読めないようにするため）。
export async function GET() {
  const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
  if (unauthorized || !currentAdminUser) {
    return unauthorized;
  }

  try {
    const missions = await listMissionsForCompany(currentAdminUser.companyId);
    return NextResponse.json(missions);
  } catch (err) {
    return missionErrorResponse(err, "GET /api/missions");
  }
}
