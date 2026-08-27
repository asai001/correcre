import "server-only";

import { formatWeekdayJa, isValidYYYYMMDD } from "@correcre/lib/date/business-days";
import { nowYYYYMMDD } from "@correcre/lib/date/format";
import { listExchangeHistoryByCompanyAndUser } from "@correcre/lib/dynamodb/exchange-history";
import { getMerchandise } from "@correcre/lib/dynamodb/merchandise";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  resolveMerchantScheduleRecipients,
  sendMerchantDateRequestedEmail,
  sendScheduleConfirmedEmails,
} from "@correcre/lib/notification/schedule-events";
import { isSelectable } from "@correcre/lib/schedule/engine";
import {
  cancelScheduleWithExchange,
  isScheduleActive,
  requestDate,
  selectCandidate,
  type ScheduleServiceConfig,
} from "@correcre/lib/schedule/service";
import type { DBUserItem, DeliveryCandidate, ExchangeHistoryItem } from "@correcre/types";
import { resolveMerchandiseFulfillment, SCHEDULE_RESCHEDULE_REQUEST_LIMIT } from "@correcre/types";

import { FRESH_ITEM_ACKNOWLEDGEMENT_TEXT } from "../model/acknowledgement";
import type {
  EmployeeScheduleCandidateView,
  EmployeeScheduleView,
  PendingScheduleSummary,
  RequestDateRequest,
  SelectCandidateRequest,
} from "../model/types";

type RuntimeConfig = {
  region: string;
  exchangeHistoryTableName: string;
  merchandiseTableName: string;
  userTableName: string;
  pointTransactionTableName: string;
  scheduleEventTableName: string;
  merchantTableName: string;
  merchantUserTableName?: string;
};

function readOptionalServerEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    exchangeHistoryTableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
    merchandiseTableName: readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
    pointTransactionTableName: readRequiredServerEnv("DDB_POINT_TRANSACTION_TABLE_NAME"),
    scheduleEventTableName: readRequiredServerEnv("DDB_SCHEDULE_EVENT_TABLE_NAME"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchantUserTableName: readOptionalServerEnv("DDB_MERCHANT_USER_TABLE_NAME"),
  };
}

// merchant への通知先を引く。通知は fire-and-forget のため失敗しても空配列を返すだけにする。
async function resolveMerchantRecipients(
  config: RuntimeConfig,
  merchantId: string | undefined,
): Promise<string[]> {
  if (!merchantId) {
    return [];
  }
  try {
    const merchant = await getMerchantById(
      {
        region: config.region,
        tableName: config.merchantTableName,
      },
      merchantId,
    );
    return await resolveMerchantScheduleRecipients(
      { region: config.region, merchantUserTableName: config.merchantUserTableName },
      merchant,
    );
  } catch (error) {
    console.error("Failed to resolve merchant recipients for schedule notification.", { error, merchantId });
    return [];
  }
}

function buildScheduleServiceConfig(config: RuntimeConfig): ScheduleServiceConfig {
  return {
    region: config.region,
    exchangeHistoryTableName: config.exchangeHistoryTableName,
    scheduleEventTableName: config.scheduleEventTableName,
    userTableName: config.userTableName,
    pointTransactionTableName: config.pointTransactionTableName,
  };
}

export class ExchangeScheduleNotFoundError extends Error {
  constructor(message = "対象の交換が見つかりません") {
    super(message);
    this.name = "ExchangeScheduleNotFoundError";
  }
}

export class AcknowledgementRequiredError extends Error {
  constructor(message = "生鮮品のため、注意事項への同意が必要です。") {
    super(message);
    this.name = "AcknowledgementRequiredError";
  }
}

export class InvalidRequestedDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRequestedDateError";
  }
}

async function findExchangeForEmployee(
  config: RuntimeConfig,
  user: DBUserItem,
  exchangeId: string,
): Promise<ExchangeHistoryItem> {
  const items = await listExchangeHistoryByCompanyAndUser(
    {
      region: config.region,
      tableName: config.exchangeHistoryTableName,
    },
    user.companyId,
    user.userId,
  );

  const item = items.find((entry) => entry.exchangeId === exchangeId);
  if (!item) {
    throw new ExchangeScheduleNotFoundError();
  }

  return item;
}

// 例: 9月5日(土)
function formatDateLabel(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}月${day}日(${formatWeekdayJa(date)})`;
}

// selectableUntil (ISO/UTC) を JST の「◯月◯日(◯) HH:mm」ラベルにする
function formatDeadlineLabel(selectableUntil: string): string {
  const date = new Date(selectableUntil);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  return `${formatDateLabel(ymd)} ${get("hour")}:${get("minute")}`;
}

function toCandidateView(candidate: DeliveryCandidate, now: Date): EmployeeScheduleCandidateView {
  return {
    arrivalDate: candidate.arrivalDate,
    arrivalDateLabel: formatDateLabel(candidate.arrivalDate),
    selectableUntil: candidate.selectableUntil,
    selectableUntilLabel: `${formatDeadlineLabel(candidate.selectableUntil)}まで選択可能`,
    selectable: isSelectable(candidate, now),
  };
}

async function buildScheduleView(
  config: RuntimeConfig,
  item: ExchangeHistoryItem,
): Promise<EmployeeScheduleView | null> {
  const schedule = item.schedule;
  if (!schedule) {
    return null;
  }

  const now = new Date();

  const merchandise =
    item.merchantId && item.merchandiseId
      ? await getMerchandise(
          {
            region: config.region,
            tableName: config.merchandiseTableName,
          },
          item.merchantId,
          item.merchandiseId,
        )
      : null;

  const fulfillment = resolveMerchandiseFulfillment(merchandise?.fulfillment);
  const requiresAcknowledgement =
    fulfillment.temperatureZone === "REFRIGERATED" || fulfillment.temperatureZone === "FROZEN";

  return {
    exchangeId: item.exchangeId,
    merchandiseName: item.merchandiseNameSnapshot,
    merchantName: item.merchantNameSnapshot,
    usedPoint: item.usedPoint,
    status: item.status ?? "REQUESTED",
    scheduleStatus: schedule.scheduleStatus,
    candidates: schedule.candidates.map((candidate) => toCandidateView(candidate, now)),
    merchantNote: schedule.merchantNote,
    merchantRejectReason: schedule.merchantRejectReason,
    selectedArrivalDate: schedule.selectedArrivalDate,
    selectedArrivalDateLabel: schedule.selectedArrivalDate
      ? formatDateLabel(schedule.selectedArrivalDate)
      : undefined,
    selectedTimeSlot: schedule.selectedTimeSlot,
    confirmedAt: schedule.confirmedAt,
    requestedArrivalDate: schedule.requestedArrivalDate,
    requestedTimeSlot: schedule.requestedTimeSlot,
    requestedNote: schedule.requestedNote,
    availableTimeSlots: fulfillment.availableTimeSlots,
    canRequestDate: schedule.rescheduleRequestCount < SCHEDULE_RESCHEDULE_REQUEST_LIMIT,
    remainingRequestCount: Math.max(0, SCHEDULE_RESCHEDULE_REQUEST_LIMIT - schedule.rescheduleRequestCount),
    canCancel: isScheduleActive(item),
    requiresAcknowledgement,
    acknowledgementText: FRESH_ITEM_ACKNOWLEDGEMENT_TEXT,
    temperatureZone: fulfillment.temperatureZone,
  };
}

export async function getScheduleForEmployee(
  user: DBUserItem,
  exchangeId: string,
): Promise<EmployeeScheduleView> {
  const config = getRuntimeConfig();
  const item = await findExchangeForEmployee(config, user, exchangeId);
  const view = await buildScheduleView(config, item);

  if (!view) {
    throw new ExchangeScheduleNotFoundError("この交換に日程調整はありません");
  }

  return view;
}

/** マイページのバナー用。日程調整が進行中の交換を返す */
export async function listPendingSchedulesForEmployee(user: DBUserItem): Promise<PendingScheduleSummary[]> {
  const config = getRuntimeConfig();
  const items = await listExchangeHistoryByCompanyAndUser(
    {
      region: config.region,
      tableName: config.exchangeHistoryTableName,
    },
    user.companyId,
    user.userId,
  );

  const now = new Date();

  return items
    .filter((item) => isScheduleActive(item))
    .map((item) => {
      const schedule = item.schedule!;
      const selectableCandidates = schedule.candidates.filter((candidate) => isSelectable(candidate, now));
      const nearest = selectableCandidates
        .map((candidate) => candidate.selectableUntil)
        .sort()
        .at(0);

      return {
        exchangeId: item.exchangeId,
        merchandiseName: item.merchandiseNameSnapshot,
        scheduleStatus: schedule.scheduleStatus,
        nearestDeadlineLabel:
          schedule.scheduleStatus === "AWAITING_SELECTION" && nearest
            ? `${formatDeadlineLabel(nearest)}まで`
            : undefined,
      } satisfies PendingScheduleSummary;
    });
}

export async function selectCandidateForEmployee(
  user: DBUserItem,
  exchangeId: string,
  request: SelectCandidateRequest,
): Promise<EmployeeScheduleView> {
  const config = getRuntimeConfig();
  const item = await findExchangeForEmployee(config, user, exchangeId);
  const view = await buildScheduleView(config, item);

  if (!view) {
    throw new ExchangeScheduleNotFoundError("この交換に日程調整はありません");
  }

  // 生鮮品は同意チェックなしでは確定できない。同意した時刻と文言そのものを保存する。
  if (view.requiresAcknowledgement && request.acknowledged !== true) {
    throw new AcknowledgementRequiredError();
  }

  const timeSlot = normalizeTimeSlot(request.timeSlot, view.availableTimeSlots);

  const updated = await selectCandidate(buildScheduleServiceConfig(config), {
    item,
    arrivalDate: request.arrivalDate,
    timeSlot,
    acknowledgedText: view.requiresAcknowledgement ? FRESH_ITEM_ACKNOWLEDGEMENT_TEXT : undefined,
    actor: { actor: "EMPLOYEE", actorId: user.userId },
    now: new Date(),
  });

  // 日程確定を両者に通知（fire-and-forget）
  try {
    const merchantRecipients = await resolveMerchantRecipients(config, updated.merchantId);
    if (updated.schedule?.selectedArrivalDate) {
      await sendScheduleConfirmedEmails({
        config: { region: config.region },
        merchantRecipients,
        employeeRecipient: user.email?.trim() || undefined,
        exchange: updated,
        arrivalDate: updated.schedule.selectedArrivalDate,
        timeSlot: updated.schedule.selectedTimeSlot,
      });
    }
  } catch (error) {
    console.error("Failed to send schedule confirmed notifications.", { error, exchangeId: updated.exchangeId });
  }

  return (await buildScheduleView(config, updated)) ?? view;
}

function normalizeTimeSlot(timeSlot: string | undefined, availableTimeSlots: string[]): string | undefined {
  const trimmed = timeSlot?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (availableTimeSlots.length > 0 && !availableTimeSlots.includes(trimmed)) {
    throw new InvalidRequestedDateError("時間帯の指定が正しくありません。");
  }
  return trimmed;
}

export async function requestDateForEmployee(
  user: DBUserItem,
  exchangeId: string,
  request: RequestDateRequest,
): Promise<EmployeeScheduleView> {
  const config = getRuntimeConfig();
  const item = await findExchangeForEmployee(config, user, exchangeId);
  const view = await buildScheduleView(config, item);

  if (!view) {
    throw new ExchangeScheduleNotFoundError("この交換に日程調整はありません");
  }

  // 希望日は merchant の承諾でそのまま確定するため、生鮮品の同意は申請時点で必須にする。
  if (view.requiresAcknowledgement && request.acknowledged !== true) {
    throw new AcknowledgementRequiredError();
  }

  if (!isValidYYYYMMDD(request.requestedArrivalDate)) {
    throw new InvalidRequestedDateError("希望日の形式が正しくありません。");
  }

  // 過去・当日は成立しないため弾く。曜日・準備期間の判定は merchant が応答時に判断する
  // （システム判定は参考情報として merchant 画面に表示され、本人の判断を上書きしない）。
  if (request.requestedArrivalDate <= nowYYYYMMDD()) {
    throw new InvalidRequestedDateError("希望日は明日以降の日付を指定してください。");
  }

  const timeSlot = normalizeTimeSlot(request.requestedTimeSlot, view.availableTimeSlots);

  const updated = await requestDate(buildScheduleServiceConfig(config), {
    item,
    requestedArrivalDate: request.requestedArrivalDate,
    requestedTimeSlot: timeSlot,
    requestedNote: request.requestedNote,
    acknowledgedText: view.requiresAcknowledgement ? FRESH_ITEM_ACKNOWLEDGEMENT_TEXT : undefined,
    actor: { actor: "EMPLOYEE", actorId: user.userId },
    now: new Date(),
  });

  // merchant に応答を依頼（fire-and-forget）
  try {
    const recipients = await resolveMerchantRecipients(config, updated.merchantId);
    if (recipients.length > 0) {
      await sendMerchantDateRequestedEmail({
        config: { region: config.region },
        recipients,
        exchange: updated,
        requestedArrivalDate: request.requestedArrivalDate,
        requestedTimeSlot: timeSlot,
        requestedNote: updated.schedule?.requestedNote,
      });
    }
  } catch (error) {
    console.error("Failed to send merchant date requested notification.", { error, exchangeId: updated.exchangeId });
  }

  return (await buildScheduleView(config, updated)) ?? view;
}

/**
 * 日程調整中の交換を employee 自身がキャンセルする。
 * 商品はまだ発送されていないため、ポイントは必ず返還される。
 */
export async function cancelScheduleForEmployee(
  user: DBUserItem,
  exchangeId: string,
  reason?: string,
): Promise<EmployeeScheduleView> {
  const config = getRuntimeConfig();
  const item = await findExchangeForEmployee(config, user, exchangeId);

  const updated = await cancelScheduleWithExchange(buildScheduleServiceConfig(config), {
    item,
    exchangeNextStatus: "CANCELED",
    reason: reason?.trim() || "従業員によるキャンセル",
    actor: { actor: "EMPLOYEE", actorId: user.userId },
    now: new Date(),
  });

  const view = await buildScheduleView(config, updated);
  if (!view) {
    throw new ExchangeScheduleNotFoundError("この交換に日程調整はありません");
  }
  return view;
}
