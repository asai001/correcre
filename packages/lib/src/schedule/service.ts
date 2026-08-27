import "server-only";

import { randomUUID } from "node:crypto";

import { TransactWriteCommand, UpdateCommand, type TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";

import type {
  DeliveryCandidate,
  ExchangeHistoryActorType,
  ExchangeHistoryItem,
  ExchangeHistoryStatus,
  ExchangeHistoryStatusEvent,
  ExchangeSchedule,
  ScheduleEventActor,
  ScheduleEventType,
  ScheduleStatus,
} from "@correcre/types";
import { SCHEDULE_PROPOSAL_ROUND_LIMIT, SCHEDULE_RESCHEDULE_REQUEST_LIMIT } from "@correcre/types";

import { getDynamoDocumentClient } from "../dynamodb/client";
import {
  buildExchangeHistoryByMerchantStatusGsiPk,
  buildExchangeHistoryByScheduleStatusGsiPk,
  buildExchangeHistoryScheduleGsiSkByArrival,
  buildExchangeHistoryScheduleGsiSkByExchangedAt,
  canTransitionExchangeStatus,
  InvalidExchangeStatusTransitionError,
} from "../dynamodb/exchange-history";
import { createPointTransaction, createPointTransactionPutTransactItem } from "../dynamodb/point-transaction";
import { buildScheduleEventPk, buildScheduleEventSk, listScheduleEvents } from "../dynamodb/schedule-event";
import { buildUserSk } from "../dynamodb/user";
import {
  buildCandidateFromShipDate,
  calcSelectableUntil,
  generateCandidates,
  isSelectable,
  type ScheduleCalendarSettings,
  type ScheduleProductSettings,
} from "./engine";
import { addCalendarDays } from "../date/business-days";

// 配送日程調整のドメインサービス。
// すべての状態変更は「交換レコードの schedule 更新（scheduleStatus の楽観ロック付き）+
// ScheduleEvent の追記」を 1 つの TransactWrite で行い、操作ログの欠落を防ぐ。

export type ScheduleServiceConfig = {
  region: string;
  exchangeHistoryTableName: string;
  scheduleEventTableName: string;
  userTableName: string;
  pointTransactionTableName: string;
};

export type ScheduleActor = {
  actor: ScheduleEventActor;
  actorId?: string;
  actorName?: string;
};

export const SCHEDULE_ACTIVE_STATUSES: readonly ScheduleStatus[] = [
  "AWAITING_PROPOSAL",
  "AWAITING_SELECTION",
  "AWAITING_MERCHANT_RESPONSE",
];

export function resolveScheduleStatus(item: Pick<ExchangeHistoryItem, "schedule">): ScheduleStatus {
  return item.schedule?.scheduleStatus ?? "NOT_REQUIRED";
}

export function isScheduleActive(item: Pick<ExchangeHistoryItem, "schedule">): boolean {
  return SCHEDULE_ACTIVE_STATUSES.includes(resolveScheduleStatus(item));
}

export class ScheduleStateError extends Error {
  constructor(
    public readonly current: ScheduleStatus,
    public readonly operation: string,
  ) {
    super(`Schedule operation ${operation} is not allowed in status ${current}`);
    this.name = "ScheduleStateError";
  }
}

export class ScheduleConflictError extends Error {
  constructor(message = "日程調整の状態が他の操作によって更新されています。最新の状態を確認してください。") {
    super(message);
    this.name = "ScheduleConflictError";
  }
}

export class EmptyCandidatesError extends Error {
  constructor(message = "候補日を1件以上追加してください。") {
    super(message);
    this.name = "EmptyCandidatesError";
  }
}

export class CandidateNotSelectableError extends Error {
  constructor(message = "選択された日は受付を終了しました。最新の候補からお選びください。") {
    super(message);
    this.name = "CandidateNotSelectableError";
  }
}

export class ProposalRoundLimitError extends Error {
  constructor(message = "候補の再提示回数が上限に達しています。") {
    super(message);
    this.name = "ProposalRoundLimitError";
  }
}

export class RescheduleRequestLimitError extends Error {
  constructor(message = "希望日の申請回数が上限に達しています。候補から選択するか、交換をキャンセルしてください。") {
    super(message);
    this.name = "RescheduleRequestLimitError";
  }
}

type ScheduleEventDraft = {
  eventType: ScheduleEventType;
  payload: Record<string, unknown>;
};

type ExchangeStatusChange = {
  nextStatus: ExchangeHistoryStatus;
  actorType: ExchangeHistoryActorType;
  actorId?: string;
  actorName?: string;
  comment?: string;
  refund: boolean;
};

// gsi4（スパース GSI）のキーを次のスケジュール状態に合わせて組み立てる。
// 終端（CANCELLED）は null を返し、キーを REMOVE してインデックスから外す。
function buildGsi4Keys(
  item: ExchangeHistoryItem,
  nextSchedule: ExchangeSchedule,
): { gsi4pk: string; gsi4sk: string } | null {
  const status = nextSchedule.scheduleStatus;

  if (status === "CONFIRMED") {
    if (!nextSchedule.selectedArrivalDate) {
      return null;
    }
    return {
      gsi4pk: buildExchangeHistoryByScheduleStatusGsiPk(status),
      gsi4sk: buildExchangeHistoryScheduleGsiSkByArrival(nextSchedule.selectedArrivalDate),
    };
  }

  if (SCHEDULE_ACTIVE_STATUSES.includes(status)) {
    return {
      gsi4pk: buildExchangeHistoryByScheduleStatusGsiPk(status),
      gsi4sk: buildExchangeHistoryScheduleGsiSkByExchangedAt(item.exchangedAt),
    };
  }

  return null;
}

type ScheduleTransactionParams = {
  item: ExchangeHistoryItem;
  nextSchedule: ExchangeSchedule;
  occurredAt: string;
  actor: ScheduleActor;
  events: ScheduleEventDraft[];
  statusChange?: ExchangeStatusChange;
};

function buildExchangeUpdateItem(
  config: ScheduleServiceConfig,
  params: ScheduleTransactionParams,
): NonNullable<TransactWriteCommandInput["TransactItems"]>[number] {
  const { item, nextSchedule, occurredAt, statusChange } = params;
  const currentScheduleStatus = resolveScheduleStatus(item);

  const setExpressions: string[] = ["#schedule = :schedule", "updatedAt = :updatedAt"];
  const removeExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = { "#schedule": "schedule" };
  const expressionAttributeValues: Record<string, unknown> = {
    ":schedule": nextSchedule,
    ":updatedAt": occurredAt,
    ":expectedScheduleStatus": currentScheduleStatus,
  };

  // 楽観ロック: 読み込み時点の scheduleStatus と一致する場合のみ更新する。
  const conditionExpressions: string[] = ["#schedule.scheduleStatus = :expectedScheduleStatus"];

  const gsi4 = buildGsi4Keys(item, nextSchedule);
  if (gsi4) {
    setExpressions.push("gsi4pk = :gsi4pk", "gsi4sk = :gsi4sk");
    expressionAttributeValues[":gsi4pk"] = gsi4.gsi4pk;
    expressionAttributeValues[":gsi4sk"] = gsi4.gsi4sk;
  } else {
    removeExpressions.push("gsi4pk", "gsi4sk");
  }

  if (statusChange) {
    const event: ExchangeHistoryStatusEvent = {
      status: statusChange.nextStatus,
      occurredAt,
      actorType: statusChange.actorType,
      actorId: statusChange.actorId,
      actorName: statusChange.actorName,
      comment: statusChange.comment,
    };

    expressionAttributeNames["#status"] = "status";
    expressionAttributeNames["#history"] = "history";
    setExpressions.push(
      "#status = :status",
      "#history = list_append(if_not_exists(#history, :emptyList), :event)",
    );
    expressionAttributeValues[":status"] = statusChange.nextStatus;
    expressionAttributeValues[":event"] = [event];
    expressionAttributeValues[":emptyList"] = [];

    // 交換ステータス側の楽観ロック（旧レコードは REQUESTED 相当）
    if (item.status === undefined) {
      conditionExpressions.push("attribute_not_exists(#status)");
    } else {
      conditionExpressions.push("#status = :expectedFromStatus");
      expressionAttributeValues[":expectedFromStatus"] = item.status;
    }

    if (item.merchantId) {
      setExpressions.push("gsi2pk = :gsi2pk");
      expressionAttributeValues[":gsi2pk"] = buildExchangeHistoryByMerchantStatusGsiPk(
        item.merchantId,
        statusChange.nextStatus,
      );
    }

    if (statusChange.refund) {
      setExpressions.push("canceledAt = :canceledAt", "pointHeld = :zero");
      expressionAttributeValues[":canceledAt"] = occurredAt;
      expressionAttributeValues[":zero"] = 0;
    }
  }

  const updateExpression =
    `SET ${setExpressions.join(", ")}` +
    (removeExpressions.length > 0 ? ` REMOVE ${removeExpressions.join(", ")}` : "");

  return {
    Update: {
      TableName: config.exchangeHistoryTableName,
      Key: {
        pk: item.pk,
        sk: item.sk,
      },
      ConditionExpression: conditionExpressions.join(" AND "),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    },
  };
}

// スケジュール更新 + 返金（必要時）+ 操作ログ追記を 1 トランザクションで実行する。
// ScheduleEvent の連番が並行操作と衝突した場合のみ採番し直してリトライする。
async function executeScheduleTransaction(
  config: ScheduleServiceConfig,
  params: ScheduleTransactionParams,
): Promise<ExchangeHistoryItem> {
  const client = getDynamoDocumentClient(config.region);
  const { item, occurredAt, actor, events, statusChange } = params;

  const baseItems: NonNullable<TransactWriteCommandInput["TransactItems"]> = [
    buildExchangeUpdateItem(config, params),
  ];

  const refundAmount = statusChange?.refund ? (item.pointHeld ?? 0) : 0;
  if (statusChange?.refund && refundAmount > 0) {
    baseItems.push({
      Update: {
        TableName: config.userTableName,
        Key: {
          companyId: item.companyId,
          sk: buildUserSk(item.userId),
        },
        UpdateExpression: "SET currentPointBalance = currentPointBalance + :refund, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":refund": refundAmount,
          ":updatedAt": occurredAt,
        },
      },
    });
    baseItems.push(
      createPointTransactionPutTransactItem(
        config.pointTransactionTableName,
        createPointTransaction({
          companyId: item.companyId,
          userId: item.userId,
          transactionId: randomUUID(),
          occurredAt,
          type: "EXCHANGE_REFUND",
          deltaPoint: refundAmount,
          sourceType: "EXCHANGE_HISTORY",
          sourceId: item.exchangeId,
          actorType: statusChange.actorType,
          actorUserId: statusChange.actorId,
          description: item.merchandiseNameSnapshot,
        }),
      ),
    );
  }

  let seqBase = (await listScheduleEvents(
    { region: config.region, tableName: config.scheduleEventTableName },
    item.exchangeId,
  )).length;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const eventItems = events.map((draft, index) => ({
      Put: {
        TableName: config.scheduleEventTableName,
        Item: {
          pk: buildScheduleEventPk(item.exchangeId),
          sk: buildScheduleEventSk(seqBase + index + 1),
          exchangeRequestId: item.exchangeId,
          seq: seqBase + index + 1,
          occurredAt,
          actor: actor.actor,
          actorId: actor.actorId,
          actorName: actor.actorName,
          eventType: draft.eventType,
          payload: draft.payload,
        },
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
      },
    }));

    try {
      await client.send(new TransactWriteCommand({ TransactItems: [...baseItems, ...eventItems] }));
      return applyScheduleResult(params, refundAmount);
    } catch (error) {
      const failure = classifyTransactionFailure(error, baseItems.length);
      if (failure === "event-seq-conflict") {
        seqBase = (await listScheduleEvents(
          { region: config.region, tableName: config.scheduleEventTableName },
          item.exchangeId,
        )).length;
        continue;
      }
      if (failure === "exchange-conflict") {
        throw new ScheduleConflictError();
      }
      throw error;
    }
  }

  throw new ScheduleConflictError();
}

function applyScheduleResult(params: ScheduleTransactionParams, refundAmount: number): ExchangeHistoryItem {
  const { item, nextSchedule, occurredAt, statusChange } = params;
  const updated: ExchangeHistoryItem = {
    ...item,
    schedule: nextSchedule,
    updatedAt: occurredAt,
  };

  const gsi4 = buildGsi4Keys(item, nextSchedule);
  if (gsi4) {
    updated.gsi4pk = gsi4.gsi4pk as ExchangeHistoryItem["gsi4pk"];
    updated.gsi4sk = gsi4.gsi4sk as ExchangeHistoryItem["gsi4sk"];
  } else {
    delete updated.gsi4pk;
    delete updated.gsi4sk;
  }

  if (statusChange) {
    updated.status = statusChange.nextStatus;
    updated.history = [
      ...(item.history ?? []),
      {
        status: statusChange.nextStatus,
        occurredAt,
        actorType: statusChange.actorType,
        actorId: statusChange.actorId,
        actorName: statusChange.actorName,
        comment: statusChange.comment,
      },
    ];
    if (item.merchantId) {
      updated.gsi2pk = buildExchangeHistoryByMerchantStatusGsiPk(item.merchantId, statusChange.nextStatus);
    }
    if (statusChange.refund) {
      updated.canceledAt = occurredAt;
      updated.pointHeld = 0;
    }
    void refundAmount;
  }

  return updated;
}

// TransactWrite の失敗理由を分類する。CancellationReasons は TransactItems と同順で並ぶため、
// 交換レコード側（先頭 baseCount 件）の条件不成立と、ScheduleEvent の連番衝突を区別できる。
function classifyTransactionFailure(
  error: unknown,
  baseCount: number,
): "exchange-conflict" | "event-seq-conflict" | "other" {
  if (!error || typeof error !== "object") {
    return "other";
  }

  const e = error as { name?: string; CancellationReasons?: Array<{ Code?: string }> };

  if (e.name !== "TransactionCanceledException" || !Array.isArray(e.CancellationReasons)) {
    return "other";
  }

  const failedIndexes = e.CancellationReasons.map((reason, index) =>
    reason?.Code === "ConditionalCheckFailed" ? index : -1,
  ).filter((index) => index >= 0);

  if (failedIndexes.length === 0) {
    return "other";
  }

  if (failedIndexes.some((index) => index < baseCount)) {
    return "exchange-conflict";
  }

  return "event-seq-conflict";
}

function requireScheduleStatus(
  item: ExchangeHistoryItem,
  allowed: ScheduleStatus[],
  operation: string,
): ExchangeSchedule {
  const schedule = item.schedule;
  const current = resolveScheduleStatus(item);
  if (!schedule || !allowed.includes(current)) {
    throw new ScheduleStateError(current, operation);
  }
  return schedule;
}

export type ProposeCandidatesInput = {
  item: ExchangeHistoryItem;
  // merchant が確定させた到着日（自動生成候補からの取捨選択 + 任意追加後）
  arrivalDates: string[];
  merchantNote?: string;
  actor: ScheduleActor;
  now: Date;
  product: ScheduleProductSettings;
  calendar: ScheduleCalendarSettings | null;
  // 再提示（希望日への応答・期限切れ後の再生成）のときは proposalRoundCount を消費する
  eventType?: Extract<ScheduleEventType, "CANDIDATES_PROPOSED" | "CANDIDATES_REGENERATED">;
};

/**
 * merchant による候補提示（AWAITING_PROPOSAL から）。
 * 到着日はサーバー側で shipDate / selectableUntil を再計算して保存する。
 * 発送可能曜日外・休業日の到着日もブロックしない（臨時に発送できる日もあり、
 * merchant 本人の判断をシステムが上書きすべきではない。UI 側で警告表示に留める）。
 */
export async function proposeCandidates(
  config: ScheduleServiceConfig,
  input: ProposeCandidatesInput,
): Promise<ExchangeHistoryItem> {
  const schedule = requireScheduleStatus(input.item, ["AWAITING_PROPOSAL"], "proposeCandidates");
  const candidates = buildCandidatesFromArrivalDates(input.arrivalDates, input.now, input.product, input.calendar);
  const occurredAt = input.now.toISOString();

  const nextSchedule: ExchangeSchedule = {
    ...schedule,
    scheduleStatus: "AWAITING_SELECTION",
    candidates,
    merchantNote: input.merchantNote?.trim() || undefined,
    merchantRejectReason: undefined,
    // 提示が済んだので、提示催促の送信済みマーカーを解除する（次に詰まったとき再送できるように）
    proposalReminderSentAt: undefined,
  };

  return executeScheduleTransaction(config, {
    item: input.item,
    nextSchedule,
    occurredAt,
    actor: input.actor,
    events: [
      {
        eventType: input.eventType ?? "CANDIDATES_PROPOSED",
        payload: {
          candidates,
          merchantNote: nextSchedule.merchantNote,
        },
      },
    ],
  });
}

/**
 * 候補の再提示。merchant の「別候補を再提示」（AWAITING_MERCHANT_RESPONSE から）と、
 * 全候補期限切れ時のシステム再生成（AWAITING_SELECTION から）の両方で使う。
 * proposalRoundCount を消費する（上限 SCHEDULE_PROPOSAL_ROUND_LIMIT）。
 */
export async function reproposeCandidates(
  config: ScheduleServiceConfig,
  input: ProposeCandidatesInput,
): Promise<ExchangeHistoryItem> {
  const schedule = requireScheduleStatus(
    input.item,
    ["AWAITING_MERCHANT_RESPONSE", "AWAITING_SELECTION"],
    "reproposeCandidates",
  );

  if (schedule.proposalRoundCount >= SCHEDULE_PROPOSAL_ROUND_LIMIT) {
    throw new ProposalRoundLimitError();
  }

  const candidates = buildCandidatesFromArrivalDates(input.arrivalDates, input.now, input.product, input.calendar);
  const occurredAt = input.now.toISOString();

  const nextSchedule: ExchangeSchedule = {
    ...schedule,
    scheduleStatus: "AWAITING_SELECTION",
    candidates,
    merchantNote: input.merchantNote?.trim() || schedule.merchantNote,
    proposalRoundCount: schedule.proposalRoundCount + 1,
    merchantRejectReason: undefined,
    // 新しい候補セットに対する催促・提示依頼を改めて送れるようにリセットする
    selectionReminderSentAt: undefined,
    proposalReminderSentAt: undefined,
  };

  return executeScheduleTransaction(config, {
    item: input.item,
    nextSchedule,
    occurredAt,
    actor: input.actor,
    events: [
      {
        eventType: input.eventType ?? "CANDIDATES_PROPOSED",
        payload: {
          candidates,
          merchantNote: nextSchedule.merchantNote,
          proposalRoundCount: nextSchedule.proposalRoundCount,
        },
      },
    ],
  });
}

function buildCandidatesFromArrivalDates(
  arrivalDates: string[],
  now: Date,
  product: ScheduleProductSettings,
  calendar: ScheduleCalendarSettings | null,
): DeliveryCandidate[] {
  const uniqueDates = Array.from(new Set(arrivalDates)).sort();
  if (uniqueDates.length === 0) {
    throw new EmptyCandidatesError();
  }

  const candidates = uniqueDates.map((arrivalDate) => {
    const shipDate = addCalendarDays(arrivalDate, -product.transitDays);
    return {
      arrivalDate,
      shipDate,
      selectableUntil: calcSelectableUntil(shipDate, product, calendar),
    } satisfies DeliveryCandidate;
  });

  // 全候補が提示時点で期限切れなら、employee が選べない提示になるため弾く
  if (!candidates.some((candidate) => isSelectable(candidate, now))) {
    throw new EmptyCandidatesError(
      "すべての候補が選択期限切れです。より先の日付の候補を追加してください。",
    );
  }

  return candidates;
}

export type SelectCandidateInput = {
  item: ExchangeHistoryItem;
  arrivalDate: string;
  timeSlot?: string;
  // 生鮮品の同意（同意時点の文言そのものを保存する）
  acknowledgedText?: string;
  actor: ScheduleActor;
  now: Date;
};

/**
 * employee が候補を選択して日程を確定する（AWAITING_SELECTION から）。
 * 画面を開いたまま日付をまたぐケースがあるため、確定時にサーバー側で isSelectable を再検証する。
 * 確定と同時に交換ステータスを REQUESTED → PREPARING へ SYSTEM が自動遷移させる。
 */
export async function selectCandidate(
  config: ScheduleServiceConfig,
  input: SelectCandidateInput,
): Promise<ExchangeHistoryItem> {
  const schedule = requireScheduleStatus(input.item, ["AWAITING_SELECTION"], "selectCandidate");

  const candidate = schedule.candidates.find((entry) => entry.arrivalDate === input.arrivalDate);
  if (!candidate || !isSelectable(candidate, input.now)) {
    throw new CandidateNotSelectableError();
  }

  return confirmSchedule(config, {
    item: input.item,
    schedule,
    arrivalDate: candidate.arrivalDate,
    shipDate: candidate.shipDate,
    timeSlot: input.timeSlot,
    acknowledgedText: input.acknowledgedText,
    actor: input.actor,
    now: input.now,
    selectionEvent: {
      eventType: "CANDIDATE_SELECTED",
      payload: {
        arrivalDate: candidate.arrivalDate,
        shipDate: candidate.shipDate,
        timeSlot: input.timeSlot,
        selectableUntil: candidate.selectableUntil,
      },
    },
  });
}

export type RequestDateInput = {
  item: ExchangeHistoryItem;
  requestedArrivalDate: string;
  requestedTimeSlot?: string;
  requestedNote?: string;
  // 生鮮品の同意（希望日経由で確定した場合も同意記録が残るよう、申請時点で保存する）
  acknowledgedText?: string;
  actor: ScheduleActor;
  now: Date;
};

/**
 * employee が「この中に受け取れる日がない」として希望日を伝える（AWAITING_SELECTION から）。
 * rescheduleRequestCount を消費する（上限 SCHEDULE_RESCHEDULE_REQUEST_LIMIT）。
 */
export async function requestDate(
  config: ScheduleServiceConfig,
  input: RequestDateInput,
): Promise<ExchangeHistoryItem> {
  const schedule = requireScheduleStatus(input.item, ["AWAITING_SELECTION"], "requestDate");

  if (schedule.rescheduleRequestCount >= SCHEDULE_RESCHEDULE_REQUEST_LIMIT) {
    throw new RescheduleRequestLimitError();
  }

  const occurredAt = input.now.toISOString();
  const nextSchedule: ExchangeSchedule = {
    ...schedule,
    scheduleStatus: "AWAITING_MERCHANT_RESPONSE",
    requestedArrivalDate: input.requestedArrivalDate,
    requestedTimeSlot: input.requestedTimeSlot,
    requestedNote: input.requestedNote?.trim() || undefined,
    rescheduleRequestCount: schedule.rescheduleRequestCount + 1,
    // merchant の応答督促を改めて送れるようにリセットする
    responseReminderSentAt: undefined,
    // 希望日が merchant に承諾されるとそのまま確定するため、同意はこの時点で記録しておく
    ...(input.acknowledgedText
      ? { acknowledgedAt: occurredAt, acknowledgedText: input.acknowledgedText }
      : {}),
  };

  return executeScheduleTransaction(config, {
    item: input.item,
    nextSchedule,
    occurredAt,
    actor: input.actor,
    events: [
      {
        eventType: "DATE_REQUESTED",
        payload: {
          requestedArrivalDate: input.requestedArrivalDate,
          requestedTimeSlot: input.requestedTimeSlot,
          requestedNote: nextSchedule.requestedNote,
          rescheduleRequestCount: nextSchedule.rescheduleRequestCount,
        },
      },
    ],
  });
}

export type AcceptRequestedDateInput = {
  item: ExchangeHistoryItem;
  actor: ScheduleActor;
  now: Date;
  product: ScheduleProductSettings;
  calendar: ScheduleCalendarSettings | null;
};

/**
 * merchant が employee の希望日を承諾して確定する（AWAITING_MERCHANT_RESPONSE から）。
 * システム判定（validateRequestedDate）が不成立でも、merchant 本人の判断を優先してブロックしない。
 */
export async function acceptRequestedDate(
  config: ScheduleServiceConfig,
  input: AcceptRequestedDateInput,
): Promise<ExchangeHistoryItem> {
  const schedule = requireScheduleStatus(input.item, ["AWAITING_MERCHANT_RESPONSE"], "acceptRequestedDate");

  const arrivalDate = schedule.requestedArrivalDate;
  if (!arrivalDate) {
    throw new ScheduleStateError(schedule.scheduleStatus, "acceptRequestedDate");
  }

  const candidate = buildCandidateFromShipDate(
    addCalendarDays(arrivalDate, -input.product.transitDays),
    input.product,
    input.calendar,
  );

  return confirmSchedule(config, {
    item: input.item,
    schedule,
    arrivalDate,
    shipDate: candidate.shipDate,
    timeSlot: schedule.requestedTimeSlot,
    acknowledgedText: schedule.acknowledgedText,
    actor: input.actor,
    now: input.now,
    selectionEvent: {
      eventType: "REQUEST_ACCEPTED",
      payload: {
        arrivalDate,
        shipDate: candidate.shipDate,
        timeSlot: schedule.requestedTimeSlot,
      },
    },
    keepExistingAcknowledgement: true,
  });
}

type ConfirmScheduleParams = {
  item: ExchangeHistoryItem;
  schedule: ExchangeSchedule;
  arrivalDate: string;
  shipDate: string;
  timeSlot?: string;
  acknowledgedText?: string;
  actor: ScheduleActor;
  now: Date;
  selectionEvent: ScheduleEventDraft;
  keepExistingAcknowledgement?: boolean;
};

async function confirmSchedule(
  config: ScheduleServiceConfig,
  params: ConfirmScheduleParams,
): Promise<ExchangeHistoryItem> {
  const occurredAt = params.now.toISOString();
  const fromStatus = params.item.status ?? "REQUESTED";

  if (!canTransitionExchangeStatus(fromStatus, "PREPARING", "SYSTEM")) {
    throw new InvalidExchangeStatusTransitionError(fromStatus, "PREPARING", "SYSTEM");
  }

  const acknowledgement = params.keepExistingAcknowledgement
    ? {
        acknowledgedAt: params.schedule.acknowledgedAt,
        acknowledgedText: params.schedule.acknowledgedText,
      }
    : params.acknowledgedText
      ? { acknowledgedAt: occurredAt, acknowledgedText: params.acknowledgedText }
      : { acknowledgedAt: params.schedule.acknowledgedAt, acknowledgedText: params.schedule.acknowledgedText };

  const nextSchedule: ExchangeSchedule = {
    ...params.schedule,
    scheduleStatus: "CONFIRMED",
    selectedArrivalDate: params.arrivalDate,
    selectedTimeSlot: params.timeSlot,
    confirmedAt: occurredAt,
    ...acknowledgement,
  };

  return executeScheduleTransaction(config, {
    item: params.item,
    nextSchedule,
    occurredAt,
    actor: params.actor,
    statusChange: {
      nextStatus: "PREPARING",
      actorType: "SYSTEM",
      comment: `配送日程が確定しました（お届け日 ${params.arrivalDate}${params.timeSlot ? ` ${params.timeSlot}` : ""}）`,
      refund: false,
    },
    events: [
      params.selectionEvent,
      {
        eventType: "CONFIRMED",
        payload: {
          arrivalDate: params.arrivalDate,
          shipDate: params.shipDate,
          timeSlot: params.timeSlot,
          acknowledgedAt: nextSchedule.acknowledgedAt,
          acknowledgedText: nextSchedule.acknowledgedText,
        },
      },
    ],
  });
}

export type RejectRequestedDateInput = {
  item: ExchangeHistoryItem;
  reason: string;
  actor: ScheduleActor;
  now: Date;
};

/**
 * merchant が希望日に対応できない場合（AWAITING_MERCHANT_RESPONSE → AWAITING_SELECTION）。
 * employee 側には理由とともに「別の日を希望」「キャンセル」の選択肢を提示する。
 */
export async function rejectRequestedDate(
  config: ScheduleServiceConfig,
  input: RejectRequestedDateInput,
): Promise<ExchangeHistoryItem> {
  const schedule = requireScheduleStatus(input.item, ["AWAITING_MERCHANT_RESPONSE"], "rejectRequestedDate");
  const occurredAt = input.now.toISOString();

  const nextSchedule: ExchangeSchedule = {
    ...schedule,
    scheduleStatus: "AWAITING_SELECTION",
    merchantRejectReason: input.reason.trim(),
    selectionReminderSentAt: undefined,
  };

  return executeScheduleTransaction(config, {
    item: input.item,
    nextSchedule,
    occurredAt,
    actor: input.actor,
    events: [
      {
        eventType: "REQUEST_REJECTED",
        payload: {
          requestedArrivalDate: schedule.requestedArrivalDate,
          reason: nextSchedule.merchantRejectReason,
        },
      },
    ],
  });
}

export type CancelScheduleInput = {
  item: ExchangeHistoryItem;
  // 交換側の終端ステータス。merchant の却下は REJECTED、それ以外は CANCELED
  exchangeNextStatus: Extract<ExchangeHistoryStatus, "CANCELED" | "REJECTED">;
  reason?: string;
  actor: ScheduleActor;
  // 交換履歴・返金トランザクションに記録する actorType。
  // ScheduleEvent の actor 型に含まれない OPERATOR の操作では actor: SYSTEM とあわせて指定する。
  exchangeActorType?: ExchangeHistoryActorType;
  now: Date;
  // 期限切れ・上限到達による自動キャンセルのとき、CANCELLED の前に DEADLINE_EXPIRED を記録する
  deadlineExpired?: boolean;
};

/**
 * 日程調整中の交換をキャンセルする。
 * 商品が発送されていない段階のため、必ずポイントを返還する（指針 3）。
 */
export async function cancelScheduleWithExchange(
  config: ScheduleServiceConfig,
  input: CancelScheduleInput,
): Promise<ExchangeHistoryItem> {
  const schedule = requireScheduleStatus(
    input.item,
    ["AWAITING_PROPOSAL", "AWAITING_SELECTION", "AWAITING_MERCHANT_RESPONSE"],
    "cancelScheduleWithExchange",
  );

  const exchangeActorType = input.exchangeActorType ?? input.actor.actor;
  const fromStatus = input.item.status ?? "REQUESTED";
  if (!canTransitionExchangeStatus(fromStatus, input.exchangeNextStatus, exchangeActorType)) {
    throw new InvalidExchangeStatusTransitionError(fromStatus, input.exchangeNextStatus, exchangeActorType);
  }

  const occurredAt = input.now.toISOString();
  const nextSchedule: ExchangeSchedule = {
    ...schedule,
    scheduleStatus: "CANCELLED",
  };

  const events: ScheduleEventDraft[] = [];
  if (input.deadlineExpired) {
    events.push({
      eventType: "DEADLINE_EXPIRED",
      payload: {
        scheduleStatus: schedule.scheduleStatus,
        proposalRoundCount: schedule.proposalRoundCount,
        rescheduleRequestCount: schedule.rescheduleRequestCount,
      },
    });
  }
  events.push({
    eventType: "CANCELLED",
    payload: {
      exchangeNextStatus: input.exchangeNextStatus,
      reason: input.reason,
      refundPoint: input.item.pointHeld ?? 0,
    },
  });

  return executeScheduleTransaction(config, {
    item: input.item,
    nextSchedule,
    occurredAt,
    actor: input.actor,
    statusChange: {
      nextStatus: input.exchangeNextStatus,
      actorType: exchangeActorType,
      actorId: input.actor.actorId,
      actorName: input.actor.actorName,
      comment: input.reason,
      refund: true,
    },
    events,
  });
}

export type ScheduleReminderField =
  | "proposalReminderSentAt"
  | "selectionReminderSentAt"
  | "responseReminderSentAt"
  | "arrivalReminderSentAt";

/**
 * 日次バッチの送信済みガード。既に送信済みならエラーにせず false を返す（冪等）。
 * 多重送信を防ぐため送信前に立て、送信に失敗した場合は clearScheduleReminderSent で必ず戻すこと。
 */
export async function markScheduleReminderSent(
  config: ScheduleServiceConfig,
  params: {
    item: ExchangeHistoryItem;
    field: ScheduleReminderField;
    sentAt: string;
  },
): Promise<boolean> {
  const client = getDynamoDocumentClient(config.region);

  try {
    await client.send(
      new UpdateCommand({
        TableName: config.exchangeHistoryTableName,
        Key: {
          pk: params.item.pk,
          sk: params.item.sk,
        },
        ConditionExpression: "attribute_exists(#schedule) AND attribute_not_exists(#schedule.#field)",
        UpdateExpression: "SET #schedule.#field = :sentAt",
        ExpressionAttributeNames: {
          "#schedule": "schedule",
          "#field": params.field,
        },
        ExpressionAttributeValues: {
          ":sentAt": params.sentAt,
        },
      }),
    );
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { name?: string }).name === "ConditionalCheckFailedException"
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * 送信済みマーカーを取り消す。
 * メール送信が失敗したときに呼び、次回のバッチで再送できるようにする
 * （特に確定日前日のリマインドは受取失敗を防ぐ要のため、送れずに握り潰さない）。
 */
export async function clearScheduleReminderSent(
  config: ScheduleServiceConfig,
  params: { item: ExchangeHistoryItem; field: ScheduleReminderField },
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new UpdateCommand({
      TableName: config.exchangeHistoryTableName,
      Key: {
        pk: params.item.pk,
        sk: params.item.sk,
      },
      ConditionExpression: "attribute_exists(#schedule)",
      UpdateExpression: "REMOVE #schedule.#field",
      ExpressionAttributeNames: {
        "#schedule": "schedule",
        "#field": params.field,
      },
    }),
  );
}

/** 交換履歴レコードの gsi4 キーを外す（到着日が過ぎた CONFIRMED のクリーンアップ用） */
export async function removeScheduleGsiKeys(
  config: ScheduleServiceConfig,
  item: Pick<ExchangeHistoryItem, "pk" | "sk">,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  await client.send(
    new UpdateCommand({
      TableName: config.exchangeHistoryTableName,
      Key: {
        pk: item.pk,
        sk: item.sk,
      },
      UpdateExpression: "REMOVE gsi4pk, gsi4sk",
    }),
  );
}

// generateCandidates を service 経由でも使えるよう再エクスポート（バッチ・feature 層の利便用）
export { generateCandidates };
