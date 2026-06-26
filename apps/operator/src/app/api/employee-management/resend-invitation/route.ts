import { NextResponse } from "next/server";
import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { resendEmployeeInvitationInDynamo } from "@operator/features/user-registration/api/server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

const RESEND_INVITATION_FAILED_MESSAGE = "招待メールの再送に失敗しました。時間をおいて再度お試しください。";

type ResendInvitationRequest = {
  companyId?: string;
  userId?: string;
};

export async function POST(req: Request) {
  const access = await getOperatorAccessStatus();
  if (!access.allowed) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";

    return NextResponse.json({ error }, { status });
  }

  let body: ResendInvitationRequest | null = null;

  try {
    body = (await req.json()) as ResendInvitationRequest;
  } catch (err) {
    console.error("POST /api/employee-management/resend-invitation invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const userId = body?.userId?.trim();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const employee = await resendEmployeeInvitationInDynamo(body.companyId, { userId });
    return NextResponse.json(employee);
  } catch (err) {
    console.error("POST /api/employee-management/resend-invitation error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: RESEND_INVITATION_FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      const status = err.message === "Company not found" || err.message === "Employee not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
