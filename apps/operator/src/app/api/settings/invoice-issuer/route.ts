import { NextResponse } from "next/server";

import { normalizeInvoiceIssuerInput } from "@correcre/lib/company-invoice";
import { isSystemSettingTableMissingError } from "@correcre/lib/dynamodb/system-setting";

import { updateInvoiceIssuerSettings } from "@operator/features/invoice-issuer-settings/api/server";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

// 導入企業向け請求書に載せる発行元情報（会社名・住所・登録番号・振込先など）を保存する。
export async function PUT(req: Request) {
  const access = await getOperatorAccessStatus();

  if (!access.allowed) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";
    return NextResponse.json({ error }, { status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = normalizeInvoiceIssuerInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const saved = await updateInvoiceIssuerSettings({ issuer: result.issuer, updatedBy: access.user.userId });
    return NextResponse.json(saved);
  } catch (err) {
    console.error("PUT /api/settings/invoice-issuer error", err);
    if (isSystemSettingTableMissingError(err)) {
      return NextResponse.json(
        { error: "設定テーブルが未作成です。infra のデプロイ（system-setting テーブルの作成）が必要です。" },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "請求書の発行元情報の保存に失敗しました。時間をおいて再度お試しください。" }, { status: 500 });
  }
}
