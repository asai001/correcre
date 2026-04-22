import { NextResponse } from "next/server";

import { getAdminUserForSession } from "@admin/lib/auth/current-user";
import { getAdminSession } from "@admin/lib/auth/session";

export async function authorizeEmployeeManagementRequest() {
  const session = await getAdminSession();

  if (!session) {
    return {
      unauthorized: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      currentAdminUser: null,
    };
  }

  const currentAdminUser = await getAdminUserForSession(session);

  if (!currentAdminUser) {
    return {
      unauthorized: NextResponse.json({ error: "admin_only" }, { status: 403 }),
      currentAdminUser: null,
    };
  }

  return {
    unauthorized: null,
    currentAdminUser,
  };
}
