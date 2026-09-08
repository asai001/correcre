import { AUTO_COMPLETE_GRACE_DAYS, AUTO_COMPLETE_NOTICE_DAYS } from "@correcre/types";

import {
  isAutoCompleteDue,
  isAutoCompleteNoticeDue,
  resolveAutoCompleteSchedule,
} from "../auto-complete";

describe("resolveAutoCompleteSchedule", () => {
  test("既定ではお届け日を起点に、予告 7 日後・自動完了 14 日後", () => {
    expect(AUTO_COMPLETE_NOTICE_DAYS).toBe(7);
    expect(AUTO_COMPLETE_GRACE_DAYS).toBe(14);

    expect(resolveAutoCompleteSchedule({ arrivalDate: "2026-09-01" })).toEqual({
      countFrom: "2026-09-01",
      noticeDate: "2026-09-08",
      completeDate: "2026-09-15",
    });
  });

  test("月をまたいでも暦日で正しく数える", () => {
    expect(resolveAutoCompleteSchedule({ arrivalDate: "2026-08-25" })).toEqual({
      countFrom: "2026-08-25",
      noticeDate: "2026-09-01",
      completeDate: "2026-09-08",
    });
  });

  test("未着報告を解除した交換は解除日を起点に数え直す", () => {
    // お届け日 9/1 の交換を 9/20 に解除した場合。お届け日を起点のままにすると
    // 9/15 が完了日となり、解除した翌朝に予告もなく即完了してしまう。
    const schedule = resolveAutoCompleteSchedule({
      arrivalDate: "2026-09-01",
      autoCompleteFrom: "2026-09-20",
    });

    expect(schedule).toEqual({
      countFrom: "2026-09-20",
      noticeDate: "2026-09-27",
      completeDate: "2026-10-04",
    });

    // 解除した翌日には、まだ完了も予告もしない
    expect(isAutoCompleteDue("2026-09-21", schedule)).toBe(false);
    expect(isAutoCompleteNoticeDue("2026-09-21", schedule)).toBe(false);
  });
});

describe("isAutoCompleteDue / isAutoCompleteNoticeDue", () => {
  const schedule = resolveAutoCompleteSchedule({ arrivalDate: "2026-09-01" });

  test("完了日の当日から自動完了の対象になる", () => {
    expect(isAutoCompleteDue("2026-09-14", schedule)).toBe(false);
    expect(isAutoCompleteDue("2026-09-15", schedule)).toBe(true);
    expect(isAutoCompleteDue("2026-09-16", schedule)).toBe(true);
  });

  test("予告日の当日から予告の対象になる", () => {
    expect(isAutoCompleteNoticeDue("2026-09-07", schedule)).toBe(false);
    expect(isAutoCompleteNoticeDue("2026-09-08", schedule)).toBe(true);
  });

  test("お届け日当日や翌日には何も起きない", () => {
    expect(isAutoCompleteDue("2026-09-01", schedule)).toBe(false);
    expect(isAutoCompleteNoticeDue("2026-09-02", schedule)).toBe(false);
  });
});
