import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { removeSavedFilterForEmployee } from "@employee/features/exchange-favorite/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ filterId: string }>;
};

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const user = await requireCurrentEmployeeUser();
    const { filterId } = await params;

    if (!filterId) {
      return NextResponse.json({ error: "filterId は必須です" }, { status: 400 });
    }

    await removeSavedFilterForEmployee({
      companyId: user.companyId,
      userId: user.userId,
      filterId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/exchange/saved-filters/[filterId] error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
