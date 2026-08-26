import "server-only";

import { addCalendarDays, isValidYYYYMMDD } from "@correcre/lib/date/business-days";
import { getMerchantCalendar, putMerchantCalendar } from "@correcre/lib/dynamodb/merchant-calendar";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { MerchantCalendarItem } from "@correcre/types";

import type { MerchantCalendarView, UpdateMerchantCalendarRequest } from "../model/types";

type RuntimeConfig = {
  region: string;
  merchantCalendarTableName: string;
};

// 期間展開の上限。誤入力（数年にわたる期間など）でレコードが際限なく肥大化するのを防ぐ。
const MAX_CLOSED_DATES = 800;

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    merchantCalendarTableName: readRequiredServerEnv("DDB_MERCHANT_CALENDAR_TABLE_NAME"),
  };
}

export class InvalidCalendarInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCalendarInputError";
  }
}

function toView(item: MerchantCalendarItem | null): MerchantCalendarView {
  return {
    closedDates: item?.closedDates ?? [],
    regularClosedWeekdays: item?.regularClosedWeekdays ?? [],
    treatPublicHolidaysAsClosed: item?.treatPublicHolidaysAsClosed ?? true,
    updatedAt: item?.updatedAt,
  };
}

export async function getCalendarForMerchant(merchantId: string): Promise<MerchantCalendarView> {
  const config = getRuntimeConfig();
  const item = await getMerchantCalendar(
    {
      region: config.region,
      tableName: config.merchantCalendarTableName,
    },
    merchantId,
  );

  return toView(item);
}

// 期間指定を日付へ展開し、単日指定とあわせて重複排除・昇順で保存用に正規化する。
function normalizeClosedDates(input: UpdateMerchantCalendarRequest): string[] {
  const dates = new Set<string>();

  for (const date of input.closedDates ?? []) {
    if (!isValidYYYYMMDD(date)) {
      throw new InvalidCalendarInputError("休業日の日付形式が正しくありません。");
    }
    dates.add(date);
  }

  for (const range of input.closedRanges ?? []) {
    if (!isValidYYYYMMDD(range.from) || !isValidYYYYMMDD(range.to) || range.from > range.to) {
      throw new InvalidCalendarInputError("休業期間の指定が正しくありません。");
    }

    let cursor = range.from;
    while (cursor <= range.to) {
      dates.add(cursor);
      if (dates.size > MAX_CLOSED_DATES) {
        throw new InvalidCalendarInputError("休業日の登録数が多すぎます。期間を見直してください。");
      }
      cursor = addCalendarDays(cursor, 1);
    }
  }

  if (dates.size > MAX_CLOSED_DATES) {
    throw new InvalidCalendarInputError("休業日の登録数が多すぎます。期間を見直してください。");
  }

  return Array.from(dates).sort();
}

export async function updateCalendarForMerchant(
  merchantId: string,
  input: UpdateMerchantCalendarRequest,
): Promise<MerchantCalendarView> {
  const config = getRuntimeConfig();

  const regularClosedWeekdays = Array.from(
    new Set((input.regularClosedWeekdays ?? []).map((day) => Math.floor(Number(day)))),
  )
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b);

  const existing = await getMerchantCalendar(
    {
      region: config.region,
      tableName: config.merchantCalendarTableName,
    },
    merchantId,
  );

  const now = new Date().toISOString();
  const item: MerchantCalendarItem = {
    merchantId,
    closedDates: normalizeClosedDates(input),
    regularClosedWeekdays,
    treatPublicHolidaysAsClosed: input.treatPublicHolidaysAsClosed !== false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await putMerchantCalendar(
    {
      region: config.region,
      tableName: config.merchantCalendarTableName,
    },
    item,
  );

  return toView(item);
}
