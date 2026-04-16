import { NextResponse } from "next/server";

import { updateOwnProfileInDynamo } from "@employee/features/profile-edit/api/server";
import type { UpdateOwnProfileInput } from "@employee/features/profile-edit/model/types";
import { getEmployeeUserForSession } from "@employee/lib/auth/current-user";
import { getEmployeeSession } from "@employee/lib/auth/session";

export const runtime = "nodejs";

async function authorizeProfileRequest() {
  const session = await getEmployeeSession();

  if (!session) {
    return {
      unauthorized: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      currentUser: null,
    };
  }

  const currentUser = await getEmployeeUserForSession(session);

  if (!currentUser) {
    return {
      unauthorized: NextResponse.json({ error: "employee_not_found" }, { status: 403 }),
      currentUser: null,
    };
  }

  return {
    unauthorized: null,
    currentUser,
  };
}

export async function PATCH(req: Request) {
  let body: UpdateOwnProfileInput | null = null;

  try {
    const { unauthorized, currentUser } = await authorizeProfileRequest();
    if (unauthorized || !currentUser) {
      return unauthorized;
    }

    body = (await req.json()) as UpdateOwnProfileInput;
    const profile = await updateOwnProfileInDynamo(currentUser, body);
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("PATCH /api/profile invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    console.error("PATCH /api/profile error", err);

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
