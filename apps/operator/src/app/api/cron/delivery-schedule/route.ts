import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { runDeliveryScheduleBatch } from "@operator/features/delivery-schedule-batch/api/server";

export const dynamic = "force-dynamic";
// Vercel Cron から日次で呼ばれる。対象件数によっては時間がかかるため上限を引き上げる
// （プランの上限を超える指定は Vercel 側で丸められる）。
export const maxDuration = 300;

// Vercel Cron は CRON_SECRET 環境変数が設定されていると
// Authorization: Bearer <CRON_SECRET> を付けて呼び出す。手動実行も同じヘッダーで行う。
function authorize(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("CRON_SECRET is not set. Rejecting cron request.");
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }

  const header = req.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}

export async function GET(req: Request) {
  const unauthorized = authorize(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await runDeliveryScheduleBatch();
    console.log("delivery-schedule batch completed.", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/cron/delivery-schedule error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "aws_credential_error" }, { status: 500 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
