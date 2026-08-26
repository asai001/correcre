// 提携企業の休業日カレンダー。1 merchant 1 レコード。
// 候補日の自動生成がこれを参照するため、事前登録しておけば merchant が候補を毎回手で外す必要がなくなる。
export type MerchantCalendarItem = {
  merchantId: string;
  // 発送できない日 (YYYY-MM-DD)。期間指定は展開して保存する
  closedDates: string[];
  // 定休日 (0=日 ... 6=土)
  regularClosedWeekdays: number[];
  // 日本の祝日を休業扱いにするか。未設定は true（祝日も営業する merchant だけが false にする）
  treatPublicHolidaysAsClosed?: boolean;
  createdAt: string;
  updatedAt: string;
};
