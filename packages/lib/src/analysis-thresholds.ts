import type { AnalysisThresholds } from "@correcre/types";

/**
 * 項目分析の閾値。ミッション単位 → 企業単位 → システム既定値 の順に解決する。
 *
 * サーバー（分析ロジック・保存時のバリデーション）とクライアント（運用者の設定画面）の
 * 双方から使うため、AWS SDK などに依存しない純粋なモジュールとして置いている。
 */

// システム既定の閾値。企業・ミッションのいずれも未設定の場合に使う。
export const DEFAULT_ANALYSIS_THRESHOLDS: AnalysisThresholds = {
  goodRate: 80,
  improvementRate: 40,
};

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

// 閾値として使える形（両方の値が揃っていて整合している）かを判定し、揃っていなければ null を返す。
// 片方だけ保存されている、といった中途半端なデータは「未設定」とみなして上位のフォールバックに委ねる。
function normalizeThresholds(thresholds?: AnalysisThresholds | null): AnalysisThresholds | null {
  if (!thresholds || !isValidRate(thresholds.goodRate) || !isValidRate(thresholds.improvementRate)) {
    return null;
  }

  if (thresholds.goodRate <= thresholds.improvementRate) {
    return null;
  }

  return { goodRate: thresholds.goodRate, improvementRate: thresholds.improvementRate };
}

/**
 * ミッション単位 → 企業単位 → システム既定値 の順で有効な閾値を1つ選ぶ。
 * 「goodRate だけ上書きする」といった項目単位の混合はせず、組で切り替える。
 */
export function resolveAnalysisThresholds(
  missionThresholds?: AnalysisThresholds | null,
  companyThresholds?: AnalysisThresholds | null,
): AnalysisThresholds {
  return (
    normalizeThresholds(missionThresholds) ??
    normalizeThresholds(companyThresholds) ??
    DEFAULT_ANALYSIS_THRESHOLDS
  );
}

// 入力値の検証。問題があればエラーメッセージ、問題なければ null を返す。
export function validateAnalysisThresholds(thresholds: AnalysisThresholds): string | null {
  if (!isValidRate(thresholds.goodRate)) {
    return "「達成率が高い項目」の閾値は 0〜100 の整数で入力してください。";
  }

  if (!isValidRate(thresholds.improvementRate)) {
    return "「改善余地がある項目」の閾値は 0〜100 の整数で入力してください。";
  }

  if (thresholds.goodRate <= thresholds.improvementRate) {
    return "「達成率が高い項目」の閾値は「改善余地がある項目」の閾値より大きい値にしてください。";
  }

  return null;
}

// 達成率(%)を閾値で振り分ける。どちらにも該当しない中間帯は "neutral"。
export function classifyAchievementRate(
  achievementRate: number,
  thresholds: AnalysisThresholds,
): "good" | "improvement" | "neutral" {
  if (achievementRate >= thresholds.goodRate) {
    return "good";
  }

  if (achievementRate <= thresholds.improvementRate) {
    return "improvement";
  }

  return "neutral";
}
