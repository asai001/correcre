import type { ExchangeHistoryStatus } from "@correcre/types";

import type { ExchangeListFilter } from "./types";

const ALLOWED_STATUSES: ReadonlyArray<ExchangeHistoryStatus> = [
  "REQUESTED",
  "PREPARING",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
  "CANCELED",
  "CANCELLED",
];

// クエリ文字列（?status=）から一覧の絞り込みを読み取る。API と一覧ページの初期表示で共通に使う。
export function parseExchangeListFilter(value: string | null | undefined): ExchangeListFilter {
  if (!value || value === "ALL") return "ALL";
  if (value === "UNFINISHED") return "UNFINISHED";
  if ((ALLOWED_STATUSES as ReadonlyArray<string>).includes(value)) {
    return value as ExchangeListFilter;
  }
  return "ALL";
}
