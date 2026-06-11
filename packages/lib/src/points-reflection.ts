import { nowYYYYMM } from "./date/format";

/**
 * ポイントの「翌月反映」を読み取り時に計算するためのユーティリティ。
 *
 * モデル:
 * - currentPointBalance … 利用可能（反映済み）な残高。交換で使えるのはこれだけ。
 * - pendingPointBalance … 今月ミッションで獲得した未反映分（まだ使えない）。
 * - pendingPointYearMonth … pendingPointBalance が属する年月（YYYY-MM）。
 *
 * 「翌月1日に反映」は、残高を読む/更新する直前に reflectPoints() を通すことで実現する。
 * pendingPointYearMonth が現在の年月より前であれば、その pending を利用可能残高へ繰り入れる。
 */
export type ReflectablePoints = {
  currentPointBalance?: number;
  pendingPointBalance?: number;
  pendingPointYearMonth?: string;
};

export type ReflectedPoints = {
  /** 利用可能な保有ポイント（反映後）。 */
  spendablePoint: number;
  /** 翌月反映予定のポイント（今月の未反映分）。 */
  pendingPoint: number;
  /** 反映後の pendingPointYearMonth（繰り入れたら undefined）。 */
  pendingPointYearMonth?: string;
  /** pending を利用可能残高へ繰り入れた（＝保存値の更新が必要）かどうか。 */
  changed: boolean;
};

/**
 * 保存されているポイント状態に「翌月反映」を適用した結果を返す（純粋関数）。
 *
 * @param source 保存されている残高・pending
 * @param currentYearMonth 現在の年月（YYYY-MM, 既定は JST の現在月）
 */
export function reflectPoints(
  source: ReflectablePoints,
  currentYearMonth: string = nowYYYYMM(),
): ReflectedPoints {
  const current = source.currentPointBalance ?? 0;
  const pending = source.pendingPointBalance ?? 0;
  const pendingYearMonth = source.pendingPointYearMonth;

  // pending が前月以前の年月のものなら、利用可能残高へ繰り入れる（= 翌月1日に反映）。
  // "YYYY-MM" は辞書順比較で年月の前後を正しく判定できる。
  if (pendingYearMonth && pendingYearMonth < currentYearMonth) {
    return {
      spendablePoint: current + pending,
      pendingPoint: 0,
      pendingPointYearMonth: undefined,
      changed: true,
    };
  }

  return {
    spendablePoint: current,
    pendingPoint: pending,
    pendingPointYearMonth: pendingYearMonth,
    changed: false,
  };
}
