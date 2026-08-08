import type { Mission } from "@correcre/types";

import { nowYYYYMM } from "./date/format";

/**
 * ミッションの「翌月月初(00:00 JST)から反映」を読み取り時に計算するためのユーティリティ。
 *
 * モデル（ポイントの翌月反映 reflectPoints と同型）:
 * - Mission.pendingChange … 未反映のスケジュール変更（反映予定月 effectiveYearMonth を持つ）。
 * - 現在の年月(JST)が effectiveYearMonth 以上になったら、その内容を現行へ繰り入れて新版とする。
 *
 * 「翌月1日に反映」は、ミッションを読む/更新する直前に reflectMission() を通すことで実現する。
 * 表示系は結果を使うだけ（非永続）。永続化は次の書き込み時に楽観ロック付きで確定する
 * （promoteScheduledMissionIfDue / operator の即時反映など）。
 */

// "YYYY-MM" の翌月を返す。例: "2026-12" -> "2027-01"
export function nextMonthYYYYMM(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

// "YYYY-MM" の月初 00:00(JST) を UTC ISO 文字列で返す。JST は固定 +09:00（DST なし）。
export function startOfYearMonthIso(yearMonth: string): string {
  return new Date(`${yearMonth}-01T00:00:00+09:00`).toISOString();
}

export type ReflectedMission = {
  /** 反映後の実効ミッション（昇格した場合は pendingChange を除去し version+1）。 */
  mission: Mission;
  /** pendingChange を現行へ繰り入れた（＝保存値の更新が必要）かどうか。 */
  changed: boolean;
};

/**
 * 保存されているミッションに「翌月反映」を適用した結果を返す（純粋関数）。
 *
 * pendingChange があり、その反映予定月(effectiveYearMonth)が現在の年月以下であれば、
 * その内容で現行フィールドを上書きし version を 1 つ進めた実効ミッションを返す。
 *
 * @param mission 保存されているミッション
 * @param currentYearMonth 現在の年月（YYYY-MM, 既定は JST の現在月）
 */
export function reflectMission(mission: Mission, currentYearMonth: string = nowYYYYMM()): ReflectedMission {
  const pending = mission.pendingChange;

  if (pending && pending.effectiveYearMonth <= currentYearMonth) {
    // pendingChange を除去した実効ミッションを構築する。
    const { pendingChange: _omitted, ...base } = mission;
    const promoted: Mission = {
      ...base,
      version: mission.version + 1,
      title: pending.title,
      description: pending.description,
      category: pending.category,
      monthlyCount: pending.monthlyCount,
      score: pending.score,
      enabled: pending.enabled,
      fields: pending.fields,
      updatedAt: startOfYearMonthIso(pending.effectiveYearMonth),
    };
    return { mission: promoted, changed: true };
  }

  return { mission, changed: false };
}
