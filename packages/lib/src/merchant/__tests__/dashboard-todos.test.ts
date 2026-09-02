import type {
  ExchangeHistoryItem,
  ExchangeSchedule,
  Merchandise,
  MerchantCalendarItem,
  ScheduleStatus,
} from "@correcre/types";

import {
  buildMerchantTodos,
  listTodoExchangeIds,
  MERCHANT_TODO_ENTRY_LIMIT,
  withApplicantNames,
  type MerchantTodoKind,
} from "../dashboard-todos";

// 2026-08-28(金) 20:43 JST
const NOW = new Date("2026-08-28T20:43:00+09:00");

function exchange(overrides: Partial<ExchangeHistoryItem> & { exchangeId: string }): ExchangeHistoryItem {
  return {
    pk: "COMPANY#c1#USER#u1",
    sk: `EXCHANGED_AT#2026-08-28T00:00:00.000Z#EXCHANGE#${overrides.exchangeId}`,
    companyId: "c1",
    userId: "u1",
    merchandiseId: "m1",
    merchandiseNameSnapshot: "チーズスフレ",
    merchantId: "merchant-1",
    usedPoint: 1200,
    exchangedAt: "2026-08-28T00:00:00.000Z",
    gsi1pk: "COMPANY#c1",
    gsi1sk: `EXCHANGED_AT#2026-08-28T00:00:00.000Z#USER#u1#EXCHANGE#${overrides.exchangeId}`,
    ...overrides,
  } as ExchangeHistoryItem;
}

function schedule(status: ScheduleStatus, overrides: Partial<ExchangeSchedule> = {}): ExchangeSchedule {
  return {
    scheduleStatus: status,
    candidates: [],
    proposalRoundCount: 0,
    rescheduleRequestCount: 0,
    ...overrides,
  };
}

function merchandise(overrides: Partial<Merchandise> & { merchandiseId: string }): Merchandise {
  return {
    merchantId: "merchant-1",
    sk: `MERCHANDISE#${overrides.merchandiseId}`,
    status: "PUBLISHED",
    heading: "見出し",
    merchandiseName: "チーズスフレ",
    serviceDescription: "説明",
    priceYen: 1200,
    requiredPoint: 1200,
    deliveryMethods: ["発送"],
    serviceArea: "全国",
    genre: "食品",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    gsi1pk: "STATUS#PUBLISHED",
    gsi1sk: `MERCHANT#merchant-1#MERCHANDISE#${overrides.merchandiseId}`,
    ...overrides,
  } as Merchandise;
}

const calendar: MerchantCalendarItem = {
  merchantId: "merchant-1",
  closedDates: [],
  regularClosedWeekdays: [3],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

function build(input: Partial<Parameters<typeof buildMerchantTodos>[0]> = {}) {
  return buildMerchantTodos({
    now: NOW,
    exchanges: [],
    merchandise: [],
    calendar,
    isAdmin: false,
    ...input,
  });
}

function kinds(todos: ReturnType<typeof buildMerchantTodos>): MerchantTodoKind[] {
  return todos.map((todo) => todo.kind);
}

describe("buildMerchantTodos", () => {
  it("やることがなければ空配列を返す", () => {
    expect(build()).toEqual([]);
  });

  it("候補提示待ちを最優先の URGENT として出す", () => {
    const todos = build({
      exchanges: [
        exchange({
          exchangeId: "e1",
          status: "REQUESTED",
          requestedAt: "2026-08-26T01:00:00.000Z",
          schedule: schedule("AWAITING_PROPOSAL"),
        }),
      ],
    });

    expect(kinds(todos)).toEqual(["SCHEDULE_PROPOSAL"]);
    expect(todos[0].severity).toBe("URGENT");
    expect(todos[0].count).toBe(1);
    expect(todos[0].entries[0]).toMatchObject({
      href: "/exchanges/e1",
      title: "チーズスフレ",
      detail: "申請から2日経過",
      emphasis: true,
    });
  });

  it("希望日への返事待ちは希望日を明細に載せる", () => {
    const todos = build({
      exchanges: [
        exchange({
          exchangeId: "e2",
          status: "REQUESTED",
          requestedAt: "2026-08-28T03:00:00.000Z",
          schedule: schedule("AWAITING_MERCHANT_RESPONSE", { requestedArrivalDate: "2026-09-05" }),
        }),
      ],
    });

    expect(kinds(todos)).toEqual(["SCHEDULE_RESPONSE"]);
    expect(todos[0].entries[0].detail).toBe("希望 9月5日(土) ・ 本日申請");
    expect(todos[0].entries[0].emphasis).toBe(false);
  });

  it("日程調整中の交換は「交換申請を承認する」に二重計上しない", () => {
    const todos = build({
      exchanges: [
        exchange({ exchangeId: "e1", status: "REQUESTED", schedule: schedule("AWAITING_PROPOSAL") }),
        exchange({ exchangeId: "e2", status: "REQUESTED", schedule: schedule("AWAITING_SELECTION") }),
        exchange({ exchangeId: "e3", status: "REQUESTED" }),
      ],
    });

    expect(kinds(todos)).toEqual(["SCHEDULE_PROPOSAL", "EXCHANGE_APPROVAL"]);
    expect(todos[1].count).toBe(1);
    expect(todos[1].entries[0].href).toBe("/exchanges/e3");
  });

  it("放置された交換申請は URGENT に昇格する", () => {
    const fresh = build({
      exchanges: [exchange({ exchangeId: "e1", status: "REQUESTED", requestedAt: "2026-08-28T00:00:00.000Z" })],
    });
    expect(fresh[0].severity).toBe("NORMAL");

    const stale = build({
      exchanges: [exchange({ exchangeId: "e1", status: "REQUESTED", requestedAt: "2026-08-26T00:00:00.000Z" })],
    });
    expect(stale[0].severity).toBe("URGENT");
  });

  it("発送日が今日・過去のものは URGENT、明日だけなら NORMAL", () => {
    const today = build({
      exchanges: [
        exchange({
          exchangeId: "e1",
          status: "PREPARING",
          schedule: schedule("CONFIRMED", {
            selectedArrivalDate: "2026-09-01",
            selectedShipDate: "2026-08-28",
            selectedTimeSlot: "午前中",
          }),
        }),
      ],
    });
    expect(kinds(today)).toEqual(["SHIPPING_DUE"]);
    expect(today[0].severity).toBe("URGENT");
    expect(today[0].entries[0].detail).toBe("本日発送 ・ お届け 9月1日(火) 午前中");

    const tomorrow = build({
      exchanges: [
        exchange({
          exchangeId: "e1",
          status: "PREPARING",
          schedule: schedule("CONFIRMED", { selectedArrivalDate: "2026-09-02", selectedShipDate: "2026-08-29" }),
        }),
      ],
    });
    expect(tomorrow[0].severity).toBe("NORMAL");
    expect(tomorrow[0].entries[0].detail).toBe("明日発送 ・ お届け 9月2日(水)");
  });

  it("発送日を過ぎているものは注意表示にする", () => {
    const todos = build({
      exchanges: [
        exchange({
          exchangeId: "e1",
          status: "PREPARING",
          schedule: schedule("CONFIRMED", { selectedArrivalDate: "2026-08-30", selectedShipDate: "2026-08-26" }),
        }),
      ],
    });
    expect(todos[0].entries[0].detail).toBe("発送予定日 8月26日(水)（過ぎています） ・ お届け 8月30日(日)");
    expect(todos[0].entries[0].emphasis).toBe(true);
  });

  it("selectedShipDate を持たない過去のレコードは商品の配送日数から逆算する", () => {
    const todos = build({
      exchanges: [
        exchange({
          exchangeId: "e1",
          status: "PREPARING",
          merchandiseId: "m1",
          schedule: schedule("CONFIRMED", { selectedArrivalDate: "2026-09-01" }),
        }),
      ],
      merchandise: [
        merchandise({
          merchandiseId: "m1",
          fulfillment: {
            fulfillmentType: "SHIPPING",
            temperatureZone: "REFRIGERATED",
            requiresScheduling: true,
            leadTimeBusinessDays: 2,
            transitDays: 4,
            shippableWeekdays: [0, 1, 2, 4, 5, 6],
            cutoffTime: "15:00",
            availableTimeSlots: [],
            candidateCount: 4,
          },
        }),
      ],
    });

    // 9/1 着 − 配送 4 日 = 8/28 発送（本日）
    expect(kinds(todos)).toContain("SHIPPING_DUE");
    expect(todos[0].entries[0].detail).toBe("本日発送 ・ お届け 9月1日(火)");
  });

  it("発送済み（対応中）や遠い発送日は出さない", () => {
    const shipped = build({
      exchanges: [
        exchange({
          exchangeId: "e1",
          status: "IN_PROGRESS",
          schedule: schedule("CONFIRMED", { selectedArrivalDate: "2026-09-01", selectedShipDate: "2026-08-28" }),
        }),
      ],
    });
    expect(shipped).toEqual([]);

    const later = build({
      exchanges: [
        exchange({
          exchangeId: "e1",
          status: "PREPARING",
          schedule: schedule("CONFIRMED", { selectedArrivalDate: "2026-09-10", selectedShipDate: "2026-09-06" }),
        }),
      ],
    });
    expect(later).toEqual([]);
  });

  it("日程調整ありの商品があってカレンダーが空なら登録を促す", () => {
    const scheduled = merchandise({
      merchandiseId: "m1",
      fulfillment: {
        fulfillmentType: "SHIPPING",
        temperatureZone: "REFRIGERATED",
        requiresScheduling: true,
        leadTimeBusinessDays: 2,
        transitDays: 1,
        shippableWeekdays: [1, 2, 3, 4, 5],
        cutoffTime: "12:00",
        availableTimeSlots: [],
        candidateCount: 4,
      },
    });

    expect(kinds(build({ merchandise: [scheduled], calendar: null }))).toEqual(["CALENDAR_SETUP"]);
    expect(build({ merchandise: [scheduled], calendar })).toEqual([]);
    // 日程調整なしの商品しかなければ促さない
    expect(build({ merchandise: [merchandise({ merchandiseId: "m2" })], calendar: null })).toEqual([]);
  });

  it("下書きの商品は INFO として最後に出す", () => {
    const todos = build({
      exchanges: [exchange({ exchangeId: "e1", status: "REQUESTED", requestedAt: "2026-08-28T00:00:00.000Z" })],
      merchandise: [merchandise({ merchandiseId: "m1", status: "DRAFT", merchandiseName: "季節のタルト" })],
    });

    expect(kinds(todos)).toEqual(["EXCHANGE_APPROVAL", "DRAFT_MERCHANDISE"]);
    expect(todos[1].severity).toBe("INFO");
    expect(todos[1].entries[0]).toMatchObject({ href: "/merchandise/m1", title: "季節のタルト" });
  });

  it("先月の請求メールは管理者にだけ、未送信のときだけ出す", () => {
    const lastMonth = exchange({
      exchangeId: "e1",
      status: "COMPLETED",
      exchangedAt: "2026-07-10T00:00:00.000Z",
    });

    expect(kinds(build({ exchanges: [lastMonth], isAdmin: true }))).toEqual(["INVOICE_EMAIL"]);
    expect(build({ exchanges: [lastMonth], isAdmin: false })).toEqual([]);
    expect(
      build({ exchanges: [lastMonth], isAdmin: true, invoiceEmailSentMonths: { "2026-07": "2026-08-01T00:00:00.000Z" } }),
    ).toEqual([]);
    // キャンセル分しかない月は請求できないので出さない
    expect(
      build({ exchanges: [{ ...lastMonth, status: "CANCELED" as const }], isAdmin: true }),
    ).toEqual([]);
  });

  it("明細は上限件数で打ち切るが、件数は全件を数える", () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      exchange({
        exchangeId: `e${index}`,
        status: "REQUESTED",
        requestedAt: `2026-08-2${index}T00:00:00.000Z`,
        schedule: schedule("AWAITING_PROPOSAL"),
      }),
    );

    const todos = build({ exchanges: many });
    expect(todos[0].count).toBe(8);
    expect(todos[0].entries).toHaveLength(MERCHANT_TODO_ENTRY_LIMIT);
    // 古い順（待たせている順）に並ぶ
    expect(todos[0].entries[0].key).toBe("e0");
  });

  it("緊急度の高い順に並ぶ", () => {
    const todos = build({
      exchanges: [
        exchange({ exchangeId: "e1", status: "REQUESTED", requestedAt: "2026-08-28T00:00:00.000Z" }),
        exchange({
          exchangeId: "e2",
          status: "REQUESTED",
          requestedAt: "2026-08-28T00:00:00.000Z",
          schedule: schedule("AWAITING_MERCHANT_RESPONSE", { requestedArrivalDate: "2026-09-05" }),
        }),
        exchange({
          exchangeId: "e3",
          status: "REQUESTED",
          requestedAt: "2026-08-28T00:00:00.000Z",
          schedule: schedule("AWAITING_PROPOSAL"),
        }),
      ],
      merchandise: [merchandise({ merchandiseId: "m1", status: "DRAFT" })],
    });

    expect(kinds(todos)).toEqual([
      "SCHEDULE_PROPOSAL",
      "SCHEDULE_RESPONSE",
      "EXCHANGE_APPROVAL",
      "DRAFT_MERCHANDISE",
    ]);
  });
});

describe("withApplicantNames / listTodoExchangeIds", () => {
  const todos = buildMerchantTodos({
    now: NOW,
    exchanges: [
      exchange({ exchangeId: "e1", status: "REQUESTED", schedule: schedule("AWAITING_PROPOSAL") }),
      exchange({ exchangeId: "e2", status: "REQUESTED" }),
    ],
    merchandise: [merchandise({ merchandiseId: "m1", status: "DRAFT" })],
    calendar,
    isAdmin: false,
  });

  it("交換由来の明細だけを名前解決の対象にする", () => {
    // 下書き商品（DRAFT_MERCHANDISE）の明細は交換 ID ではないので含めない
    expect(listTodoExchangeIds(todos).sort()).toEqual(["e1", "e2"]);
  });

  it("引けた名前だけを差し込み、引けなかった明細はそのまま残す", () => {
    const named = withApplicantNames(todos, new Map([["e1", "山田 太郎"]]));

    expect(named[0].entries[0].applicantName).toBe("山田 太郎");
    expect(named[1].entries[0].applicantName).toBeUndefined();
    // 商品由来のやることは触らない
    expect(named[2].kind).toBe("DRAFT_MERCHANDISE");
    expect(named[2].entries[0].applicantName).toBeUndefined();
  });
});
