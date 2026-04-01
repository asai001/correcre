import { NextResponse } from "next/server";

import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";
import { getOperatorAccessStatus } from "@admin/lib/auth/operator";

export async function authorizeEmployeeManagementRequest() {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";

    return {
      unauthorized: NextResponse.json({ error }, { status }),
      currentAdminUser: null,
    };
  }

  return {
    unauthorized: null,
    currentAdminUser: await requireCurrentAdminUser(),
  };
}
