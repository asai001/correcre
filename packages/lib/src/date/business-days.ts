// 営業日・休業日の計算ユーティリティ。
// 日付はすべて "YYYY-MM-DD"（Asia/Tokyo の暦日）で扱う。曜日は暦日から決まるため
// タイムゾーンに依存せず、UTC 基準の Date で安全に計算できる。
import { isJpHoliday } from "./jp-holidays";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYYYYMMDD(value: string | undefined | null): value is string {
  if (!value || !DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function toUtcDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 暦日の曜日 (0=日 ... 6=土) */
export function getWeekday(date: string): number {
  return toUtcDate(date).getUTCDay();
}

export const WEEKDAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function formatWeekdayJa(date: string): string {
  return WEEKDAY_LABELS_JA[getWeekday(date)];
}

/** 暦日ベースの加減算（月またぎ・年またぎを含む） */
export function addCalendarDays(date: string, days: number): string {
  const utc = toUtcDate(date);
  utc.setUTCDate(utc.getUTCDate() + days);
  return formatUtcDate(utc);
}

// 営業日判定に使う休業設定。MerchantCalendarItem の部分集合。
export type WorkingDayCalendar = {
  closedDates?: string[];
  regularClosedWeekdays?: number[];
  treatPublicHolidaysAsClosed?: boolean;
};

/**
 * merchant の営業日かどうか。
 * カレンダー未登録（null）の場合は「祝日以外はすべて営業」とみなす。
 * 祝日は既定で休業扱い（treatPublicHolidaysAsClosed が明示的に false のときだけ営業）。
 */
export function isMerchantWorkingDay(date: string, calendar: WorkingDayCalendar | null | undefined): boolean {
  if (calendar?.closedDates?.includes(date)) {
    return false;
  }
  if (calendar?.regularClosedWeekdays?.includes(getWeekday(date))) {
    return false;
  }
  const holidaysClosed = calendar?.treatPublicHolidaysAsClosed ?? true;
  if (holidaysClosed && isJpHoliday(date)) {
    return false;
  }
  return true;
}

// 全曜日が定休日のような設定でも無限ループしないための上限（約 2 年分）。
const BUSINESS_DAY_SCAN_LIMIT = 800;

/**
 * date から count 営業日だけ遡った日付を返す（date 自身は数えない）。
 * count = 0 のときは date をそのまま返す。
 */
export function subtractBusinessDays(
  date: string,
  count: number,
  calendar: WorkingDayCalendar | null | undefined,
): string {
  let current = date;
  let remaining = count;
  let guard = 0;

  while (remaining > 0) {
    if (guard >= BUSINESS_DAY_SCAN_LIMIT) {
      throw new Error("営業日の計算が収束しません。休業日の設定を確認してください。");
    }
    guard += 1;
    current = addCalendarDays(current, -1);
    if (isMerchantWorkingDay(current, calendar)) {
      remaining -= 1;
    }
  }

  return current;
}
