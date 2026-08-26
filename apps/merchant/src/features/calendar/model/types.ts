export type MerchantCalendarView = {
  closedDates: string[];
  regularClosedWeekdays: number[];
  treatPublicHolidaysAsClosed: boolean;
  updatedAt?: string;
};

export type UpdateMerchantCalendarRequest = {
  closedDates: string[];
  // 期間指定。サーバー側で日付に展開して closedDates と合わせて保存する
  closedRanges?: { from: string; to: string }[];
  regularClosedWeekdays: number[];
  treatPublicHolidaysAsClosed: boolean;
};
