import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { runCompanyDailyBatch } from "@operator/features/company-daily-batch/api/server";

export const dynamic = "force-dynamic";
// Vercel Cron から日次（日本時間 0 時台）で呼ばれる。導入企業の数だけ DynamoDB を読むため上限を引き上げる
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
    const result = await runCompanyDailyBatch();
    console.log("company daily batch completed.", result);
    // 会社ごとの失敗はバッチ全体を止めずに記録しているため、ここで 500 にして気づけるようにする。
    return NextResponse.json(result, { status: result.failures.length ? 500 : 200 });
  } catch (err) {
    console.error("GET /api/cron/company-daily error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "aws_credential_error" }, { status: 500 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
