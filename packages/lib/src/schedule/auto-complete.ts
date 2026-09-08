// 発送済みのまま放置された交換を自動完了させるまでの日付計算。
//
// 自動完了は「配達された」判定ではなく「異議がなければ確定とみなす」処理で、誤ると申請者が
// ポイントを失う。判定を日次バッチの中に埋めると確かめようがないので、日付の計算だけを
// ここに切り出してテストで固定する。
import { addCalendarDays } from "../date/business-days";
import { AUTO_COMPLETE_GRACE_DAYS, AUTO_COMPLETE_NOTICE_DAYS } from "@correcre/types";

export type AutoCompleteSchedule = {
  /** 猶予の起点 (YYYY-MM-DD) */
  countFrom: string;
  /** 予告メールを送る日。この日以降に送る */
  noticeDate: string;
  /** 自動完了する日。この日以降に完了させる */
  completeDate: string;
};

/**
 * 猶予の起点は原則お届け日。ただし未着報告を解除した交換は解除日から数え直す。
 *
 * お届け日を起点のまま使い回すと、解除する頃には猶予がとっくに切れていて、翌朝のバッチで
 * 予告もなく即完了してしまう。申請者から見れば「届いていないと連絡したのに、いつのまにか
 * 完了してポイントが消えた」になるため、起点を置き直せるようにしてある。
 */
export function resolveAutoCompleteSchedule(params: {
  arrivalDate: string;
  autoCompleteFrom?: string;
}): AutoCompleteSchedule {
  const countFrom = params.autoCompleteFrom ?? params.arrivalDate;
  return {
    countFrom,
    noticeDate: addCalendarDays(countFrom, AUTO_COMPLETE_NOTICE_DAYS),
    completeDate: addCalendarDays(countFrom, AUTO_COMPLETE_GRACE_DAYS),
  };
}

/** today（JST の暦日）が自動完了の日に達しているか。 */
export function isAutoCompleteDue(today: string, schedule: AutoCompleteSchedule): boolean {
  return today >= schedule.completeDate;
}

/** today（JST の暦日）が予告を送る日に達しているか。 */
export function isAutoCompleteNoticeDue(today: string, schedule: AutoCompleteSchedule): boolean {
  return today >= schedule.noticeDate;
}
