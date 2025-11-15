function getParts(d: Date, timeZone: string = "Asia/Tokyo") {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const { year, month, day, hour, minute, second } = Object.fromEntries(dtf.formatToParts(d).map((p) => [p.type, p.value]));
  return { year, month, day, hour, minute, second };
}

/**
 * 現在時刻を YYYY-MM 表記にフォーマットされた文字列で返す
 *
 * @param timezone
 * @returns
 */
export function nowYYYYMM(timezone: string = "Asia/Tokyo"): string {
  const { year, month } = getParts(new Date(), timezone);
  return `${year}-${month}`;
}

/**
 * 任意の時刻を YYYY-MM 表記にフォーマットされた文字列で返す
 *
 * @param date
 * @param timezone
 * @returns
 */
export function toYYYYMM(date: Date, timezone: string = "Asia/Tokyo"): string {
  const { year, month } = getParts(date, timezone);
  return `${year}-${month}`;
}

/**
 * 現在時刻を YYYY-MM--DD 表記にフォーマットされた文字列で返す
 *
 * @param timezone
 * @returns
 */
export function nowYYYYMMDD(timezone: string = "Asia/Tokyo"): string {
  const { year, month, day } = getParts(new Date(), timezone);
  return `${year}-${month}-${day}`;
}

/**
 * 任意の時刻を YYYY-MM-DD 表記にフォーマットされた文字列で返す
 *
 * @param date
 * @param timezone
 * @returns
 */
export function toYYYYMMDD(date: Date, timezone: string = "Asia/Tokyo"): string {
  const { year, month, day } = getParts(date, timezone);
  return `${year}-${month}-${day}`;
}

/**
 * 現在時刻を YYYY-MM-DD HH:mm 表記にフォーマットされた文字列で返す
 *
 * @param timezone
 * @returns
 */
export function nowYYYYMMDDHHmm(timezone: string = "Asia/Tokyo"): string {
  const { year, month, day, hour, minute } = getParts(new Date(), timezone);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * 任意の時刻を YYYY-MM-DD HH:mm 表記にフォーマットされた文字列で返す
 *
 * @param date
 * @param timezone
 * @returns
 */
export function toYYYYMMDDHHmm(date: Date, timezone: string = "Asia/Tokyo"): string {
  const { year, month, day, hour, minute } = getParts(date, timezone);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * 現在時刻を YYYY-MM-DD HH:mm:ss 表記にフォーマットされた文字列で返す
 *
 * @param timezone
 * @returns
 */
export function nowYYYYMMDDHHmmss(timezone: string = "Asia/Tokyo"): string {
  const { year, month, day, hour, minute, second } = getParts(new Date(), timezone);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * 任意の時刻を YYYY-MM-DD HH:mm:ss 表記にフォーマットされた文字列で返す
 *
 * @param date
 * @param timezone
 * @returns
 */
export function toYYYYMMDDHHmmss(date: Date, timezone: string = "Asia/Tokyo"): string {
  const { year, month, day, hour, minute, second } = getParts(date, timezone);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * YYYY-MM 形式かチェックする
 *
 * @param value
 * @returns
 */
export function isValidYYYYMM(value: string | undefined | null): value is string {
  if (!value) {
    return false;
  }

  // 数字のみかチェック
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const yearStr = value.slice(0, 4);
  const monthStr = value.slice(5, 7);

  const year = Number(yearStr);
  const month = Number(monthStr);

  if (year < 1900 || year > 2100) {
    return false;
  }

  if (month < 1 || month > 12) {
    return false;
  }

  return true;
}
