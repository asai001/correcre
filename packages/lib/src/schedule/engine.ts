// 配送日程の計算エンジン。日付計算はこのモジュールに集約し、フロントエンドでは行わない。
// （営業日カウント・締切時刻・タイムゾーンの解釈がフロントとサーバーで食い違うと、
// 「画面では選べたのに確定できない」という不整合が必ず発生するため）
//
// タイムゾーンは Asia/Tokyo 固定。日付境界の判定はすべて JST で行う。
// このモジュールは "server-only" を import しない純関数群として保ち、単体テスト可能にする。
import type { DeliveryCandidate, ExchangeSchedule, ProductFulfillment } from "@correcre/types";

import {
  addCalendarDays,
  formatWeekdayJa,
  getWeekday,
  isMerchantWorkingDay,
  isValidYYYYMMDD,
  subtractBusinessDays,
  WEEKDAY_LABELS_JA,
  type WorkingDayCalendar,
} from "../date/business-days";
import { toYYYYMMDD } from "../date/format";

export type ScheduleProductSettings = Pick<
  ProductFulfillment,
  "leadTimeBusinessDays" | "transitDays" | "shippableWeekdays" | "cutoffTime" | "candidateCount"
>;

export type ScheduleCalendarSettings = WorkingDayCalendar;

// 候補日の探索範囲。これを超えて発送可能日が見つからない場合は「候補なし」として返し、
// merchant に手動で候補日を追加してもらう（行き止まりを塞ぐのは提示フロー側の責務）。
const CANDIDATE_SEARCH_HORIZON_DAYS = 120;

/** 発送可能日 = 発送可能曜日（製造サイクル）かつ merchant の営業日 */
export function isShippableDate(
  date: string,
  product: ScheduleProductSettings,
  calendar: ScheduleCalendarSettings | null | undefined,
): boolean {
  if (!product.shippableWeekdays.includes(getWeekday(date))) {
    return false;
  }
  return isMerchantWorkingDay(date, calendar);
}

/** from（含む）以降の発送可能日を最大 count 件返す */
export function listShippableDates(
  from: string,
  count: number,
  product: ScheduleProductSettings,
  calendar: ScheduleCalendarSettings | null | undefined,
): string[] {
  const results: string[] = [];
  let cursor = from;

  for (let i = 0; i < CANDIDATE_SEARCH_HORIZON_DAYS && results.length < count; i += 1) {
    if (isShippableDate(cursor, product, calendar)) {
      results.push(cursor);
    }
    cursor = addCalendarDays(cursor, 1);
  }

  return results;
}

/**
 * 日程確定の締切 = 発送日から leadTimeBusinessDays 分だけ営業日を遡った日の cutoffTime（JST）。
 * ISO8601（UTC）で返す。
 */
export function calcSelectableUntil(
  shipDate: string,
  product: ScheduleProductSettings,
  calendar: ScheduleCalendarSettings | null | undefined,
): string {
  const deadlineDate = subtractBusinessDays(shipDate, product.leadTimeBusinessDays, calendar);
  return new Date(`${deadlineDate}T${product.cutoffTime}:00+09:00`).toISOString();
}

/** 発送日から候補を組み立てる（到着日 = 発送日 + transitDays） */
export function buildCandidateFromShipDate(
  shipDate: string,
  product: ScheduleProductSettings,
  calendar: ScheduleCalendarSettings | null | undefined,
): DeliveryCandidate {
  return {
    arrivalDate: addCalendarDays(shipDate, product.transitDays),
    shipDate,
    selectableUntil: calcSelectableUntil(shipDate, product, calendar),
  };
}

/**
 * 現時点から選択可能な候補日を candidateCount 件生成する。
 * 締切（selectableUntil）が既に過ぎている発送日はスキップするため、
 * 返る候補はすべて生成時点で選択可能。探索範囲内に見つからなければ少ない件数・空配列で返す。
 */
export function generateCandidates(
  now: Date,
  product: ScheduleProductSettings,
  calendar: ScheduleCalendarSettings | null | undefined,
): DeliveryCandidate[] {
  const desiredCount = product.candidateCount > 0 ? product.candidateCount : 4;
  const results: DeliveryCandidate[] = [];
  let cursor = toYYYYMMDD(now);

  for (let i = 0; i < CANDIDATE_SEARCH_HORIZON_DAYS && results.length < desiredCount; i += 1) {
    if (isShippableDate(cursor, product, calendar)) {
      const candidate = buildCandidateFromShipDate(cursor, product, calendar);
      if (isSelectable(candidate, now)) {
        results.push(candidate);
      }
    }
    cursor = addCalendarDays(cursor, 1);
  }

  return results;
}

/**
 * 候補がまだ選択できるか。
 * 表示フィルタと確定時検証の両方でこの関数を使うこと（判定ロジックを 2 箇所に分けない）。
 */
export function isSelectable(candidate: Pick<DeliveryCandidate, "selectableUntil">, now: Date): boolean {
  const until = Date.parse(candidate.selectableUntil);
  return Number.isFinite(until) && now.getTime() < until;
}

/**
 * 交換申請時の初期スケジュール。候補日は merchant 画面で叩き台として表示するために自動生成して保存する。
 */
export function buildInitialSchedule(
  now: Date,
  product: ScheduleProductSettings,
  calendar: ScheduleCalendarSettings | null | undefined,
): ExchangeSchedule {
  return {
    scheduleStatus: "AWAITING_PROPOSAL",
    candidates: generateCandidates(now, product, calendar),
    proposalRoundCount: 0,
    rescheduleRequestCount: 0,
  };
}

export type ValidateRequestedDateResult =
  | { ok: true; shipDate: string }
  | { ok: false; reason: string };

/**
 * employee の希望到着日が成立するかの判定。
 * merchant への参考情報として使う（merchant の判断をブロックするためのものではない）。
 */
export function validateRequestedDate(
  requestedArrivalDate: string,
  now: Date,
  product: ScheduleProductSettings,
  calendar: ScheduleCalendarSettings | null | undefined,
): ValidateRequestedDateResult {
  if (!isValidYYYYMMDD(requestedArrivalDate)) {
    return { ok: false, reason: "日付の形式が正しくありません。" };
  }

  const todayJst = toYYYYMMDD(now);
  if (requestedArrivalDate <= todayJst) {
    return { ok: false, reason: "到着日は明日以降の日付を指定してください。" };
  }

  const shipDate = addCalendarDays(requestedArrivalDate, -product.transitDays);

  if (!product.shippableWeekdays.includes(getWeekday(shipDate))) {
    const shippableLabels = [...product.shippableWeekdays]
      .sort((a, b) => a - b)
      .map((day) => WEEKDAY_LABELS_JA[day])
      .join("・");
    return {
      ok: false,
      reason: `この到着日に必要な発送日（${shipDate}・${formatWeekdayJa(shipDate)}曜）は発送可能曜日（${shippableLabels}）ではありません。`,
    };
  }

  if (!isMerchantWorkingDay(shipDate, calendar)) {
    return {
      ok: false,
      reason: `この到着日に必要な発送日（${shipDate}）は休業日にあたります。`,
    };
  }

  const selectableUntil = calcSelectableUntil(shipDate, product, calendar);
  if (!isSelectable({ selectableUntil }, now)) {
    return {
      ok: false,
      reason: `発送準備の期間（${product.leadTimeBusinessDays}営業日）が確保できません。受付は締め切られています。`,
    };
  }

  return { ok: true, shipDate };
}
