import { NextResponse } from "next/server";
import { getMissionFromDynamoMock } from "@employee/features/mission-report/api/server.mock";
import type { FormConfig, Mission } from "@employee/features/mission-report/model/types";

/**
 * Mission 定義（dynamodb.json の Mission）から
 * ダイアログ用の FormConfig を 1 件返すエンドポイント
 *
 * クエリ:
 *   - companyId: 会社ID
 *   - missionId: ミッションID
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const missionId = searchParams.get("missionId");

  if (!companyId || !missionId) {
    return NextResponse.json({ error: "companyId と missionId は必須です" }, { status: 400 });
  }

  try {
    // 既存のモック関数を利用して Mission 一覧を取得
    // userId はここでは不要なのでダミー値を渡す
    const { mission } = await getMissionFromDynamoMock(companyId, "__form__");

    const target = mission.find((m) => m.missionId === missionId);
    if (!target) {
      return NextResponse.json({ error: "mission_not_found" }, { status: 404 });
    }

    const cfg: FormConfig = missionToFormConfig(target);

    return NextResponse.json(cfg);
  } catch (err) {
    console.error("GET /api/mission-form-config error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

/**
 * Mission -> FormConfig 変換
 * points は Mission.score をそのまま使用
 * maxScore はひとまず 20 固定（必要に応じて見直し）
 */
function missionToFormConfig(m: Mission): FormConfig {
  return {
    companyId: m.companyId,
    missionId: m.missionId,
    version: m.version,
    title: m.title,
    fields: m.fields.map((f, index) => ({
      // dynamodb.json の定義には id がないので、label から安全な id を生成
      id: createFieldId(f.label, index),
      label: f.label,
      type: f.type,
      placeholder: f.placeholder,
      required: f.required,
      rows: f.rows,
      min: f.min,
      max: f.max,
      step: f.step,
      selectValueType: f.selectValueType,
      options: f.options,
      defaultValue: f.defaultValue,
    })),
    points: (m as any).score ?? 0,
    monthlyCount: (m as any).score ?? 0,
    order: m.order,
    enabled: m.enabled,
  };
}

/**
 * ラベル文字列からフィールド ID を生成
 * - 日本語ラベルでも動くように、英数字以外は "_" に置換
 * - 空になった場合は "field{index}" を使用
 */
function createFieldId(label: string, index: number): string {
  const base = label
    .trim()
    .normalize("NFKC")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();

  return base || `field${index + 1}`;
}
