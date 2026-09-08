export type MerchantCalendarView = {
  closedDates: string[];
  regularClosedWeekdays: number[];
  treatPublicHolidaysAsClosed: boolean;
  updatedAt?: string;
  // カレンダー表示用の祝日一覧（サーバーの静的データから供給。フロントで祝日判定はしない）
  holidays: { date: string; name: string }[];
};

export type UpdateMerchantCalendarRequest = {
  closedDates: string[];
  // 期間指定。サーバー側で日付に展開して closedDates と合わせて保存する
  closedRanges?: { from: string; to: string }[];
  regularClosedWeekdays: number[];
  treatPublicHolidaysAsClosed: boolean;
};
