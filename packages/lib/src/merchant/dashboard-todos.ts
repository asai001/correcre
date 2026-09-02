// 提携企業ダッシュボードの「やることリスト」を組み立てる純関数。
//
// 提携企業の担当者は毎日この画面を開くわけではないため、「いま自分が動かないと止まるもの」だけを
// 上から順に並べる。特に配送日程調整は、従業員がポイントを預けたまま待っている状態なので、
// 通常の交換申請よりも先に見せる。
//
// 日付判定はすべて JST（Asia/Tokyo）。この関数は DB もネットワークも触らない。
import type {
  ExchangeHistoryItem,
  ExchangeHistoryStatus,
  Merchandise,
  MerchantCalendarItem,
} from "@correcre/types";
import { resolveMerchandiseFulfillment } from "@correcre/types";

import { addCalendarDays, formatWeekdayJa } from "../date/business-days";
import { toYYYYMMDD } from "../date/format";

export type MerchantTodoSeverity = "URGENT" | "NORMAL" | "INFO";

export type MerchantTodoKind =
  | "SCHEDULE_PROPOSAL"
  | "SCHEDULE_RESPONSE"
  | "SHIPPING_DUE"
  | "EXCHANGE_APPROVAL"
  | "CALENDAR_SETUP"
  | "DRAFT_MERCHANDISE"
  | "INVOICE_EMAIL";

export type MerchantTodoEntry = {
  key: string;
  href: string;
  // 商品名など、どの案件かが分かる見出し
  title: string;
  // 申込者名。ダッシュボードの読み取り件数を抑えるため、表示する明細の分だけ後から補う
  // （withApplicantNames）。名前が引けなかった場合は省略する。
  applicantName?: string;
  // 「申請から3日経過」など、急ぎ具合が分かる補足
  detail: string;
  // 期限を過ぎているなど、特に目立たせたい行
  emphasis?: boolean;
};

export type MerchantTodo = {
  kind: MerchantTodoKind;
  severity: MerchantTodoSeverity;
  title: string;
  // なぜ対応が必要かの 1 行説明。専門用語を避け、放置したときに何が起きるかを書く。
  description: string;
  count: number;
  // 表示する明細（MERCHANT_TODO_ENTRY_LIMIT 件まで。count との差が「他 N 件」になる）
  entries: MerchantTodoEntry[];
  actionLabel: string;
  actionHref: string;
};

export type BuildMerchantTodosInput = {
  now: Date;
  exchanges: ExchangeHistoryItem[];
  merchandise: Merchandise[];
  calendar: MerchantCalendarItem | null;
  // 収支・精算は MERCHANT_ADMIN 専用のため、一般ユーザーには請求のやることを出さない
  isAdmin: boolean;
  invoiceEmailSentMonths?: Record<string, string>;
};

export const MERCHANT_TODO_ENTRY_LIMIT = 5;

// 交換申請を放置と見なす日数。日次バッチの督促（24h）より後に「急ぎ」へ昇格させる。
const EXCHANGE_APPROVAL_URGENT_DAYS = 2;

const SEVERITY_RANK: Record<MerchantTodoSeverity, number> = {
  URGENT: 0,
  NORMAL: 1,
  INFO: 2,
};

// 同じ緊急度の中での並び順。相手を待たせているものほど上。
// 明細の key が交換 ID になっている（＝申込者名を補える）やること
const EXCHANGE_BACKED_KINDS: ReadonlySet<MerchantTodoKind> = new Set<MerchantTodoKind>([
  "SCHEDULE_PROPOSAL",
  "SCHEDULE_RESPONSE",
  "SHIPPING_DUE",
  "EXCHANGE_APPROVAL",
]);

const KIND_ORDER: MerchantTodoKind[] = [
  "SCHEDULE_PROPOSAL",
  "SCHEDULE_RESPONSE",
  "SHIPPING_DUE",
  "EXCHANGE_APPROVAL",
  "CALENDAR_SETUP",
  "INVOICE_EMAIL",
  "DRAFT_MERCHANDISE",
];

function normalizeStatus(status: ExchangeHistoryStatus | undefined): ExchangeHistoryStatus {
  if (!status) return "COMPLETED";
  return status === "CANCELLED" ? "CANCELED" : status;
}

function elapsedDays(since: string | undefined, now: Date): number {
  if (!since) return 0;
  const from = Date.parse(since);
  if (!Number.isFinite(from)) return 0;
  return Math.max(0, Math.floor((now.getTime() - from) / 86_400_000));
}

function formatElapsed(since: string | undefined, now: Date): string {
  const days = elapsedDays(since, now);
  return days === 0 ? "本日申請" : `申請から${days}日経過`;
}

/** "2026-09-04" → "9月4日(金)" */
export function formatMonthDayJa(date: string): string {
  const [, month, day] = date.split("-");
  if (!month || !day) return date;
  return `${Number(month)}月${Number(day)}日(${formatWeekdayJa(date)})`;
}

/** 前月の "YYYY-MM"。収支・精算画面と揃えるためサーバーのローカル時刻で数える。 */
function previousYearMonth(now: Date): string {
  const date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function waitingSince(item: ExchangeHistoryItem): string {
  return item.requestedAt ?? item.exchangedAt;
}

function exchangeHref(item: ExchangeHistoryItem): string {
  return `/exchanges/${encodeURIComponent(item.exchangeId)}`;
}

function displayName(item: ExchangeHistoryItem): string {
  return item.merchandiseNameSnapshot || item.merchandiseId || item.exchangeId;
}

/**
 * 確定済みの発送日。確定時に保存した selectedShipDate を使い、
 * それを持たない過去のレコードだけ商品の配送日数から逆算する。
 */
function resolveShipDate(item: ExchangeHistoryItem, transitDaysByMerchandiseId: Map<string, number>): string | null {
  const schedule = item.schedule;
  if (!schedule?.selectedArrivalDate) return null;
  if (schedule.selectedShipDate) return schedule.selectedShipDate;

  const transitDays = item.merchandiseId ? transitDaysByMerchandiseId.get(item.merchandiseId) : undefined;
  if (transitDays === undefined) return null;
  return addCalendarDays(schedule.selectedArrivalDate, -transitDays);
}

function buildTodo(
  base: Omit<MerchantTodo, "count" | "entries">,
  entries: MerchantTodoEntry[],
): MerchantTodo {
  return {
    ...base,
    count: entries.length,
    entries: entries.slice(0, MERCHANT_TODO_ENTRY_LIMIT),
  };
}

export function buildMerchantTodos(input: BuildMerchantTodosInput): MerchantTodo[] {
  const { now, exchanges, merchandise, calendar, isAdmin } = input;
  const todayJst = toYYYYMMDD(now);
  const tomorrowJst = addCalendarDays(todayJst, 1);

  const transitDaysByMerchandiseId = new Map<string, number>(
    merchandise.map((item) => [item.merchandiseId, resolveMerchandiseFulfillment(item.fulfillment).transitDays]),
  );

  const todos: MerchantTodo[] = [];

  // --- 1. お届け日の候補提示待ち -------------------------------------------------
  const awaitingProposal = exchanges
    .filter((item) => item.schedule?.scheduleStatus === "AWAITING_PROPOSAL")
    .sort((a, b) => (waitingSince(a) < waitingSince(b) ? -1 : 1));

  if (awaitingProposal.length > 0) {
    todos.push(
      buildTodo(
        {
          kind: "SCHEDULE_PROPOSAL",
          severity: "URGENT",
          title: "お届け日の候補を出す",
          description:
            "お客様はポイントを預けたまま、候補が出るのを待っています。候補を出すまで先に進めません。",
          actionLabel: "交換管理を開く",
          actionHref: "/exchanges",
        },
        awaitingProposal.map((item) => ({
          key: item.exchangeId,
          href: exchangeHref(item),
          title: displayName(item),
          detail: formatElapsed(waitingSince(item), now),
          emphasis: elapsedDays(waitingSince(item), now) >= 1,
        })),
      ),
    );
  }

  // --- 2. 希望日への返事待ち -----------------------------------------------------
  const awaitingResponse = exchanges
    .filter((item) => item.schedule?.scheduleStatus === "AWAITING_MERCHANT_RESPONSE")
    .sort((a, b) => (waitingSince(a) < waitingSince(b) ? -1 : 1));

  if (awaitingResponse.length > 0) {
    todos.push(
      buildTodo(
        {
          kind: "SCHEDULE_RESPONSE",
          severity: "URGENT",
          title: "お客様の希望日に返事をする",
          description:
            "候補の中に受け取れる日がなく、別の日を希望されています。受けられる／受けられないのどちらでも構いません。",
          actionLabel: "交換管理を開く",
          actionHref: "/exchanges",
        },
        awaitingResponse.map((item) => {
          const requested = item.schedule?.requestedArrivalDate;
          return {
            key: item.exchangeId,
            href: exchangeHref(item),
            title: displayName(item),
            detail: requested
              ? `希望 ${formatMonthDayJa(requested)} ・ ${formatElapsed(waitingSince(item), now)}`
              : formatElapsed(waitingSince(item), now),
            emphasis: elapsedDays(waitingSince(item), now) >= 1,
          };
        }),
      ),
    );
  }

  // --- 3. 発送の期日が来ているもの -----------------------------------------------
  // 「準備中」のまま発送日を迎えた（過ぎた）ものだけを出す。発送して「対応中」に進めたものは対象外。
  const shippingDue = exchanges
    .flatMap((item) => {
      if (item.schedule?.scheduleStatus !== "CONFIRMED") return [];
      if (normalizeStatus(item.status) !== "PREPARING") return [];
      const shipDate = resolveShipDate(item, transitDaysByMerchandiseId);
      if (!shipDate || shipDate > tomorrowJst) return [];
      return [{ item, shipDate }];
    })
    .sort((a, b) => (a.shipDate < b.shipDate ? -1 : 1));

  if (shippingDue.length > 0) {
    const hasOverdueOrToday = shippingDue.some((entry) => entry.shipDate <= todayJst);
    todos.push(
      buildTodo(
        {
          kind: "SHIPPING_DUE",
          severity: hasOverdueOrToday ? "URGENT" : "NORMAL",
          title: "商品を発送する",
          description:
            "お届け日をお約束済みです。発送したら交換管理で「対応中」に進めてください。",
          actionLabel: "交換管理を開く",
          actionHref: "/exchanges",
        },
        shippingDue.map(({ item, shipDate }) => {
          const arrival = item.schedule?.selectedArrivalDate;
          const timeSlot = item.schedule?.selectedTimeSlot;
          const when =
            shipDate < todayJst
              ? `発送予定日 ${formatMonthDayJa(shipDate)}（過ぎています）`
              : shipDate === todayJst
                ? "本日発送"
                : "明日発送";
          const arrivalLabel = arrival
            ? ` ・ お届け ${formatMonthDayJa(arrival)}${timeSlot ? ` ${timeSlot}` : ""}`
            : "";
          return {
            key: item.exchangeId,
            href: exchangeHref(item),
            title: displayName(item),
            detail: `${when}${arrivalLabel}`,
            emphasis: shipDate <= todayJst,
          };
        }),
      ),
    );
  }

  // --- 4. 通常の交換申請の承認待ち -----------------------------------------------
  // 日程調整中のものは 1・2 で扱うため、ここでは除外する（同じ案件が二重に出ないように）。
  const awaitingApproval = exchanges
    .filter((item) => {
      if (normalizeStatus(item.status) !== "REQUESTED") return false;
      const scheduleStatus = item.schedule?.scheduleStatus;
      return !scheduleStatus || scheduleStatus === "NOT_REQUIRED" || scheduleStatus === "CANCELLED";
    })
    .sort((a, b) => (waitingSince(a) < waitingSince(b) ? -1 : 1));

  if (awaitingApproval.length > 0) {
    const oldestDays = elapsedDays(waitingSince(awaitingApproval[0]), now);
    todos.push(
      buildTodo(
        {
          kind: "EXCHANGE_APPROVAL",
          severity: oldestDays >= EXCHANGE_APPROVAL_URGENT_DAYS ? "URGENT" : "NORMAL",
          title: "交換申請を承認する",
          description: "承認すると準備中になり、お客様にも進捗が見えるようになります。",
          actionLabel: "交換管理を開く",
          actionHref: "/exchanges",
        },
        awaitingApproval.map((item) => ({
          key: item.exchangeId,
          href: exchangeHref(item),
          title: displayName(item),
          detail: formatElapsed(waitingSince(item), now),
          emphasis: elapsedDays(waitingSince(item), now) >= EXCHANGE_APPROVAL_URGENT_DAYS,
        })),
      ),
    );
  }

  // --- 5. 休業日カレンダーの登録 -------------------------------------------------
  // 日程調整ありの商品を出しているのにカレンダーが空だと、休業日にも候補が出てしまう。
  const schedulingMerchandise = merchandise.filter(
    (item) => item.status !== "UNPUBLISHED" && resolveMerchandiseFulfillment(item.fulfillment).requiresScheduling,
  );
  const calendarIsEmpty =
    !calendar || (calendar.closedDates.length === 0 && calendar.regularClosedWeekdays.length === 0);

  if (schedulingMerchandise.length > 0 && calendarIsEmpty) {
    todos.push(
      buildTodo(
        {
          kind: "CALENDAR_SETUP",
          severity: "NORMAL",
          title: "お休みの日を登録する",
          description:
            "定休日や連休をまだ登録していません。登録しておくと、お休みの日がお届け日の候補から自動で外れます。",
          actionLabel: "休業日カレンダーを開く",
          actionHref: "/calendar",
        },
        schedulingMerchandise.slice(0, MERCHANT_TODO_ENTRY_LIMIT).map((item) => ({
          key: item.merchandiseId,
          href: `/merchandise/${encodeURIComponent(item.merchandiseId)}`,
          title: item.merchandiseName,
          detail: "お届け日の調整あり",
        })),
      ),
    );
  }

  // --- 6. 先月分の請求メール（管理者のみ） ---------------------------------------
  // 月キーは収支・精算画面および請求メール API と同じ基準（サーバーのローカル時刻）で作る。
  // ここだけ JST で数えると、月初に「送れない月」を促してしまうため。
  if (isAdmin) {
    const previousMonth = previousYearMonth(now);
    const alreadySent = Boolean(input.invoiceEmailSentMonths?.[previousMonth]);
    const previousMonthExchanges = exchanges.filter((item) => {
      const status = normalizeStatus(item.status);
      // 却下・キャンセルは売上に含めない（収支・精算画面の集計と同じ基準）
      if (status === "REJECTED" || status === "CANCELED") return false;
      return item.exchangedAt.slice(0, 7) === previousMonth;
    });
    // 請求メール API は売上 0 円の月を弾くため、ポイントが動いていない月はやることに出さない。
    const hasSales = previousMonthExchanges.some((item) => (item.usedPoint ?? 0) > 0);

    if (!alreadySent && hasSales) {
      const [year, month] = previousMonth.split("-");
      todos.push({
        kind: "INVOICE_EMAIL",
        severity: "NORMAL",
        title: `${Number(month)}月分の請求メールを送る`,
        description: `${year}年${Number(month)}月の交換 ${previousMonthExchanges.length} 件分です。まだ運用者へ請求メールを送っていません。`,
        count: 1,
        entries: [],
        actionLabel: "収支・精算を開く",
        actionHref: "/settlement",
      });
    }
  }

  // --- 7. 下書きのままの商品 -----------------------------------------------------
  const drafts = merchandise
    .filter((item) => item.status === "DRAFT")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  if (drafts.length > 0) {
    todos.push(
      buildTodo(
        {
          kind: "DRAFT_MERCHANDISE",
          severity: "INFO",
          title: "下書きの商品を公開する",
          description: "下書きのままの商品は、申請者の画面には表示されません。",
          actionLabel: "商品・サービス管理を開く",
          actionHref: "/merchandise",
        },
        drafts.map((item) => ({
          key: item.merchandiseId,
          href: `/merchandise/${encodeURIComponent(item.merchandiseId)}`,
          title: item.merchandiseName,
          detail: "下書き",
        })),
      ),
    );
  }

  return todos.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
  });
}

/**
 * 表示する明細に申込者名を差し込む。
 * 名前の解決には交換 1 件ごとに従業員レコードの参照が要るため、
 * 一覧の全件ではなく「実際に画面に出る明細」の分だけ後から補う。
 */
export function withApplicantNames(
  todos: MerchantTodo[],
  applicantNameByExchangeId: Map<string, string>,
): MerchantTodo[] {
  return todos.map((todo) => {
    if (!EXCHANGE_BACKED_KINDS.has(todo.kind)) {
      return todo;
    }
    return {
      ...todo,
      entries: todo.entries.map((entry) => {
        const applicantName = applicantNameByExchangeId.get(entry.key);
        return applicantName ? { ...entry, applicantName } : entry;
      }),
    };
  });
}

/** 申込者名を引くべき交換 ID（＝実際に明細として表示されるもの）だけを返す。 */
export function listTodoExchangeIds(todos: MerchantTodo[]): string[] {
  const ids = new Set<string>();
  for (const todo of todos) {
    if (!EXCHANGE_BACKED_KINDS.has(todo.kind)) continue;
    for (const entry of todo.entries) ids.add(entry.key);
  }
  return [...ids];
}
