import { NextResponse } from "next/server";
import { buildAwsCredentialErrorMessage, isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { resendEmployeeInvitationInDynamo } from "@admin/features/employee-management/api/server";
import { authorizeEmployeeManagementRequest } from "../authorize";

type ResendInvitationRequest = {
  userId?: string;
};

export async function POST(req: Request) {
  try {
    const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
    if (unauthorized || !currentAdminUser) {
      return unauthorized;
    }

    const body = (await req.json()) as ResendInvitationRequest;
    const userId = body?.userId?.trim();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const employee = await resendEmployeeInvitationInDynamo(currentAdminUser.companyId, { userId });
    return NextResponse.json(employee);
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("POST /api/employee-management/resend-invitation invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    console.error("POST /api/employee-management/resend-invitation error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: buildAwsCredentialErrorMessage() }, { status: 500 });
    }

    if (err instanceof Error) {
      const status = err.message === "Employee not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
