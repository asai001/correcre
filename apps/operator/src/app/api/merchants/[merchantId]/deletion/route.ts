import { NextResponse } from "next/server";

import {
  deleteMerchantForOperator,
  getMerchantDeletionPreview,
  MerchantAlreadyDeletedError,
  MerchantDeletionCancellationError,
  MerchantDeletionNotConfirmedError,
  MerchantHasOpenExchangesError,
  MerchantNotFoundError,
} from "@operator/features/merchant-management/api/deletion-server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

// 提携企業の削除（運用者）。GET で削除前の確認内容（対応中の交換と申請者）を返し、
// DELETE で削除する。対象の提携企業はパスから決める。
type RouteContext = {
  params: Promise<{ merchantId: string }>;
};

const FAILED_MESSAGE = "提携企業の削除に失敗しました。時間をおいて再度お試しください。";

async function authorize() {
  const access = await getOperatorAccessStatus();
  if (!access.allowed) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";
    return { ok: false, response: NextResponse.json({ error }, { status }) } as const;
  }
  return { ok: true, user: access.user } as const;
}

function toErrorResponse(err: unknown, method: string) {
  if (err instanceof MerchantNotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  if (err instanceof MerchantAlreadyDeletedError) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
  if (err instanceof MerchantDeletionNotConfirmedError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof MerchantHasOpenExchangesError) {
    return NextResponse.json(
      { error: err.message, code: "open_exchanges", openExchanges: err.openExchanges },
      { status: 409 },
    );
  }
  if (err instanceof MerchantDeletionCancellationError) {
    return NextResponse.json(
      { error: err.message, code: "cancellation_failed", cancelledExchanges: err.cancelled, failedExchangeIds: err.failedExchangeIds },
      { status: 500 },
    );
  }
  console.error(`${method} /api/merchants/[merchantId]/deletion error`, err);
  return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
}

export async function GET(_req: Request, context: RouteContext) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;

  const { merchantId } = await context.params;
  try {
    return NextResponse.json(await getMerchantDeletionPreview(merchantId));
  } catch (err) {
    return toErrorResponse(err, "GET");
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;

  let body: { confirmName?: unknown; force?: unknown; notifyApplicants?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body?.confirmName !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { merchantId } = await context.params;
  try {
    const result = await deleteMerchantForOperator(
      {
        merchantId,
        confirmName: body.confirmName,
        force: body.force === true,
        notifyApplicants: body.notifyApplicants === true,
      },
      auth.user,
    );
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err, "DELETE");
  }
}
