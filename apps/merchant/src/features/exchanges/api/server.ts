import "server-only";

import {
  findExchangeHistoryByMerchantAndExchangeId,
  getAllowedNextExchangeStatuses,
  InvalidExchangeStatusTransitionError,
  listExchangeHistoryByMerchant,
  listExchangeHistoryByMerchantAndStatus,
  transitionExchangeStatus,
} from "@correcre/lib/dynamodb/exchange-history";
import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { getMerchandise } from "@correcre/lib/dynamodb/merchandise";
import { getMerchantCalendar } from "@correcre/lib/dynamodb/merchant-calendar";
import { listMerchantUsersByMerchant } from "@correcre/lib/dynamodb/merchant-user";
import { listScheduleEvents } from "@correcre/lib/dynamodb/schedule-event";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { createMerchandiseImageViewUrl } from "@correcre/lib/s3/merchandise-image";
import { addCalendarDays, formatWeekdayJa, getWeekday, isMerchantWorkingDay } from "@correcre/lib/date/business-days";
import {
  calcSelectableUntil,
  generateCandidates,
  isSelectable,
  validateRequestedDate,
  type ScheduleCalendarSettings,
  type ScheduleProductSettings,
} from "@correcre/lib/schedule/engine";
import {
  acceptRequestedDate,
  cancelScheduleWithExchange,
  isScheduleActive,
  proposeCandidates,
  rejectRequestedDate,
  reproposeCandidates,
  type ScheduleServiceConfig,
} from "@correcre/lib/schedule/service";
import { joinNameParts } from "@correcre/lib/user-profile";
import type {
  DBUserAddress,
  ExchangeHistoryActorType,
  ExchangeHistoryItem,
  ExchangeHistoryStatus,
  ExchangeHistoryStatusEvent,
  ExchangeSchedule,
  Merchandise,
  MerchantCalendarItem,
} from "@correcre/types";
import {
  resolveMerchandiseFulfillment,
  SCHEDULE_PROPOSAL_ROUND_LIMIT,
  SCHEDULE_RESCHEDULE_REQUEST_LIMIT,
} from "@correcre/types";

import type {
  ExchangeDetail,
  ExchangeListFilter,
  ExchangeScheduleView,
  ExchangeSummary,
  RespondScheduleRequest,
  ScheduleCandidateView,
} from "../model/types";

type RuntimeConfig = {
  region: string;
  exchangeHistoryTableName: string;
  merchandiseTableName: string;
  merchandiseImageBucketName: string;
  userTableName: string;
  companyTableName: string;
  merchantUserTableName: string;
  pointTransactionTableName: string;
  scheduleEventTableName: string;
  merchantCalendarTableName: string;
};

type ApplicantProfile = {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: DBUserAddress;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    exchangeHistoryTableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
    merchandiseTableName: readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME"),
    merchandiseImageBucketName: readRequiredServerEnv("S3_MERCHANDISE_IMAGE_BUCKET_NAME"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
    companyTableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    merchantUserTableName: readRequiredServerEnv("DDB_MERCHANT_USER_TABLE_NAME"),
    pointTransactionTableName: readRequiredServerEnv("DDB_POINT_TRANSACTION_TABLE_NAME"),
    scheduleEventTableName: readRequiredServerEnv("DDB_SCHEDULE_EVENT_TABLE_NAME"),
    merchantCalendarTableName: readRequiredServerEnv("DDB_MERCHANT_CALENDAR_TABLE_NAME"),
  };
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

// actorName を持たない過去のイベント向けに、actorId（提携企業ユーザー ID）から表示名を引き当てる。
// 新しいイベントは遷移時に actorName スナップショットを持つため、この解決は不要になる。
async function resolveMerchantActorNames(
  config: RuntimeConfig,
  merchantId: string,
  events: ReadonlyArray<ExchangeHistoryStatusEvent>,
): Promise<Map<string, string>> {
  const unresolved = events.some(
    (event) => event.actorType === "MERCHANT" && event.actorId && !event.actorName?.trim(),
  );

  if (!unresolved) {
    return new Map();
  }

  const users = await listMerchantUsersByMerchant(
    {
      region: config.region,
      tableName: config.merchantUserTableName,
    },
    merchantId,
  );

  return new Map(
    users
      .map((user) => [user.userId, joinNameParts(user.lastName, user.firstName) || user.email] as const)
      .filter(([, name]) => Boolean(name)),
  );
}

async function resolveCompanyName(config: RuntimeConfig, companyId: string): Promise<string | undefined> {
  const company = await getCompanyById(
    {
      region: config.region,
      tableName: config.companyTableName,
    },
    companyId,
  );

  if (!company) {
    return undefined;
  }

  return company.shortName || company.name;
}

function normalizeStatus(value?: ExchangeHistoryStatus): ExchangeHistoryStatus {
  if (!value) return "REQUESTED";
  if (value === "CANCELLED") return "CANCELED";
  return value;
}

function compareExchangedAtDesc(left: ExchangeSummary, right: ExchangeSummary) {
  return right.exchangedAt.localeCompare(left.exchangedAt);
}

// 履歴の最終イベントから、表示用の操作者名を解決する。
// actorName スナップショットを持たない過去のイベントは、従業員なら申請者名、
// 提携企業なら merchantActorNames（userId → 氏名）から引き当てる。
function resolveEventActorName(
  event: ExchangeHistoryStatusEvent,
  applicantName?: string,
  merchantActorNames?: Map<string, string>,
): string | undefined {
  const snapshot = event.actorName?.trim();
  if (snapshot) {
    return snapshot;
  }

  if (event.actorType === "EMPLOYEE") {
    return applicantName;
  }

  if (event.actorType === "MERCHANT" && event.actorId) {
    return merchantActorNames?.get(event.actorId);
  }

  return undefined;
}

function toSummary(
  item: ExchangeHistoryItem,
  userName?: string,
  merchantActorNames?: Map<string, string>,
): ExchangeSummary {
  const lastEvent = item.history?.at(-1);

  return {
    exchangeId: item.exchangeId,
    companyId: item.companyId,
    userId: item.userId,
    userName,
    merchandiseId: item.merchandiseId,
    merchandiseName: item.merchandiseNameSnapshot,
    usedPoint: item.usedPoint,
    pointHeld: item.pointHeld ?? 0,
    status: normalizeStatus(item.status),
    exchangedAt: item.exchangedAt,
    requestedAt: item.requestedAt,
    completedAt: item.completedAt,
    canceledAt: item.canceledAt,
    updatedAt: item.updatedAt,
    lastActionActorType: lastEvent?.actorType,
    lastActionActorName: lastEvent ? resolveEventActorName(lastEvent, userName, merchantActorNames) : undefined,
    lastActionAt: lastEvent?.occurredAt,
  };
}

async function resolveApplicantProfile(
  config: RuntimeConfig,
  companyId: string,
  userId: string,
): Promise<ApplicantProfile> {
  const user = await getUserByCompanyAndUserId(
    {
      region: config.region,
      tableName: config.userTableName,
    },
    companyId,
    userId,
  );

  return {
    name: user ? `${user.lastName ?? ""} ${user.firstName ?? ""}`.trim() || undefined : undefined,
    email: user?.email,
    phoneNumber: user?.phoneNumber,
    address: user?.address,
  };
}

async function resolveUserName(
  config: RuntimeConfig,
  companyId: string,
  userId: string,
  cache: Map<string, string>,
): Promise<string | undefined> {
  const cacheKey = `${companyId}#${userId}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const profile = await resolveApplicantProfile(config, companyId, userId);
  if (profile.name) {
    cache.set(cacheKey, profile.name);
  }
  return profile.name;
}

export async function listExchangesForMerchant(
  merchantId: string,
  filter: ExchangeListFilter = "ALL",
): Promise<ExchangeSummary[]> {
  const config = getRuntimeConfig();

  const items = filter === "ALL"
    ? await listExchangeHistoryByMerchant(
        {
          region: config.region,
          tableName: config.exchangeHistoryTableName,
        },
        merchantId,
      )
    : await listExchangeHistoryByMerchantAndStatus(
        {
          region: config.region,
          tableName: config.exchangeHistoryTableName,
        },
        merchantId,
        filter,
      );

  // 一覧に出す「最終操作者」の名前解決用。actorName スナップショットを持たない
  // 過去のイベントのために、提携企業ユーザーを 1 度だけまとめて引く。
  const lastEvents = items
    .map((item) => item.history?.at(-1))
    .filter((event): event is ExchangeHistoryStatusEvent => Boolean(event));
  const merchantActorNames = await resolveMerchantActorNames(config, merchantId, lastEvents);

  const userNameCache = new Map<string, string>();
  const summaries: ExchangeSummary[] = [];

  for (const item of items) {
    const userName = await resolveUserName(config, item.companyId, item.userId, userNameCache);
    summaries.push(toSummary(item, userName, merchantActorNames));
  }

  return summaries.sort(compareExchangedAtDesc);
}

// 候補 1 件を表示用に整える。警告はブロックではなく注意喚起（merchant の判断を優先する）。
function buildCandidateView(
  arrivalDate: string,
  now: Date,
  product: ScheduleProductSettings,
  calendar: ScheduleCalendarSettings | null,
): ScheduleCandidateView {
  const shipDate = addCalendarDays(arrivalDate, -product.transitDays);
  const selectableUntil = calcSelectableUntil(shipDate, product, calendar);
  const selectable = isSelectable({ selectableUntil }, now);

  const warnings: string[] = [];
  if (!product.shippableWeekdays.includes(getWeekday(shipDate))) {
    warnings.push(`発送日 ${shipDate}（${formatWeekdayJa(shipDate)}）は発送可能曜日ではありません`);
  }
  if (!isMerchantWorkingDay(shipDate, calendar)) {
    warnings.push(`発送日 ${shipDate} は休業日にあたります`);
  }
  if (!selectable) {
    warnings.push("この候補の選択期限は既に過ぎています");
  }

  return { arrivalDate, shipDate, selectableUntil, selectable, warnings };
}

async function loadScheduleContext(
  config: RuntimeConfig,
  item: ExchangeHistoryItem,
  merchandise: Merchandise | null,
): Promise<{
  product: ScheduleProductSettings & { availableTimeSlots: string[] };
  calendar: MerchantCalendarItem | null;
}> {
  const fulfillment = resolveMerchandiseFulfillment(merchandise?.fulfillment);
  const calendar = item.merchantId
    ? await getMerchantCalendar(
        {
          region: config.region,
          tableName: config.merchantCalendarTableName,
        },
        item.merchantId,
      )
    : null;

  return { product: fulfillment, calendar };
}

async function buildScheduleView(
  config: RuntimeConfig,
  item: ExchangeHistoryItem,
  merchandise: Merchandise | null,
): Promise<ExchangeScheduleView | undefined> {
  const schedule: ExchangeSchedule | undefined = item.schedule;
  if (!schedule) {
    return undefined;
  }

  const now = new Date();
  const { product, calendar } = await loadScheduleContext(config, item, merchandise);

  const events = await listScheduleEvents(
    {
      region: config.region,
      tableName: config.scheduleEventTableName,
    },
    item.exchangeId,
  );

  const candidates = schedule.candidates.map((candidate) =>
    buildCandidateView(candidate.arrivalDate, now, product, calendar),
  );

  // 提示・再提示フォームの叩き台。いま時点で選択可能な候補を生成し直す。
  const needsDraft =
    schedule.scheduleStatus === "AWAITING_PROPOSAL" || schedule.scheduleStatus === "AWAITING_MERCHANT_RESPONSE";
  const draftCandidates = needsDraft
    ? generateCandidates(now, product, calendar).map((candidate) =>
        buildCandidateView(candidate.arrivalDate, now, product, calendar),
      )
    : [];

  let requestedDateJudgment: ExchangeScheduleView["requestedDateJudgment"];
  if (schedule.scheduleStatus === "AWAITING_MERCHANT_RESPONSE" && schedule.requestedArrivalDate) {
    const result = validateRequestedDate(schedule.requestedArrivalDate, now, product, calendar);
    requestedDateJudgment = result.ok
      ? {
          ok: true,
          shipDate: result.shipDate,
          message: `発送可能曜日から逆算して ${result.shipDate}（${formatWeekdayJa(result.shipDate)}）発送で対応可能です`,
        }
      : { ok: false, message: result.reason };
  }

  return {
    scheduleStatus: schedule.scheduleStatus,
    candidates,
    draftCandidates,
    merchantNote: schedule.merchantNote,
    selectedArrivalDate: schedule.selectedArrivalDate,
    selectedTimeSlot: schedule.selectedTimeSlot,
    confirmedAt: schedule.confirmedAt,
    requestedArrivalDate: schedule.requestedArrivalDate,
    requestedTimeSlot: schedule.requestedTimeSlot,
    requestedNote: schedule.requestedNote,
    requestedDateJudgment,
    merchantRejectReason: schedule.merchantRejectReason,
    proposalRoundCount: schedule.proposalRoundCount,
    proposalRoundLimit: SCHEDULE_PROPOSAL_ROUND_LIMIT,
    rescheduleRequestCount: schedule.rescheduleRequestCount,
    rescheduleRequestLimit: SCHEDULE_RESCHEDULE_REQUEST_LIMIT,
    canRepropose: schedule.proposalRoundCount < SCHEDULE_PROPOSAL_ROUND_LIMIT,
    availableTimeSlots: product.availableTimeSlots,
    shippableWeekdays: product.shippableWeekdays,
    leadTimeBusinessDays: product.leadTimeBusinessDays,
    transitDays: product.transitDays,
    cutoffTime: product.cutoffTime,
    events: events.map((event) => ({
      seq: event.seq,
      occurredAt: event.occurredAt,
      actor: event.actor,
      actorName: event.actorName,
      eventType: event.eventType,
      payload: event.payload,
    })),
  };
}

async function buildExchangeDetail(
  config: RuntimeConfig,
  item: ExchangeHistoryItem,
  actorType: ExchangeHistoryActorType,
): Promise<ExchangeDetail> {
  const applicant = await resolveApplicantProfile(config, item.companyId, item.userId);

  let merchandise: Merchandise | null = null;
  let merchandiseImageViewUrl: string | undefined;

  if (item.merchantId && item.merchandiseId) {
    merchandise = await getMerchandise(
      {
        region: config.region,
        tableName: config.merchandiseTableName,
      },
      item.merchantId,
      item.merchandiseId,
    );

    const imageRef = merchandise?.cardImage ?? merchandise?.detailImage;
    if (imageRef) {
      const { url } = await createMerchandiseImageViewUrl(
        {
          region: config.region,
          bucketName: config.merchandiseImageBucketName,
        },
        imageRef.s3Key,
      );
      merchandiseImageViewUrl = url;
    }
  }

  const status = normalizeStatus(item.status);
  const companyName = await resolveCompanyName(config, item.companyId);
  const rawHistory = item.history ?? [];
  const merchantActorNames = item.merchantId
    ? await resolveMerchantActorNames(config, item.merchantId, rawHistory)
    : new Map<string, string>();

  // 表示用に操作者名を補う。従業員の操作は申請者本人なので申請者名を使う。
  const history = rawHistory.map((event) => {
    const actorName = resolveEventActorName(event, applicant.name, merchantActorNames);
    return actorName ? { ...event, actorName } : event;
  });

  const schedule = await buildScheduleView(config, item, merchandise);

  // 日程調整が進行中の間は、承認して先へ進める操作は日程確定（システム遷移）に委ねる。
  // merchant が取れるのは却下・強制キャンセルのみ。
  const allowedNextStatuses = isScheduleActive(item)
    ? getAllowedNextExchangeStatuses(status, actorType).filter(
        (nextStatus) => nextStatus === "REJECTED" || nextStatus === "CANCELED",
      )
    : getAllowedNextExchangeStatuses(status, actorType);

  return {
    ...toSummary(item, applicant.name, merchantActorNames),
    merchantId: item.merchantId ?? "",
    companyName,
    applicantEmail: applicant.email,
    applicantPhoneNumber: applicant.phoneNumber,
    applicantAddress: applicant.address,
    merchandiseImageViewUrl,
    history,
    allowedNextStatuses,
    actorType,
    schedule,
  };
}

export async function getExchangeDetailForMerchant(
  merchantId: string,
  exchangeId: string,
): Promise<ExchangeDetail | null> {
  const config = getRuntimeConfig();

  const item = await findExchangeHistoryByMerchantAndExchangeId(
    {
      region: config.region,
      tableName: config.exchangeHistoryTableName,
    },
    merchantId,
    exchangeId,
  );

  if (!item) return null;

  return buildExchangeDetail(config, item, "MERCHANT");
}

export async function transitionExchangeForMerchant(params: {
  merchantId: string;
  exchangeId: string;
  actorUserId: string;
  // 履歴に残す操作者名のスナップショット。後で改名・退職しても誰が操作したかを追える。
  actorName?: string;
  nextStatus: ExchangeHistoryStatus;
  comment?: string;
}): Promise<ExchangeDetail> {
  const config = getRuntimeConfig();

  const item = await findExchangeHistoryByMerchantAndExchangeId(
    {
      region: config.region,
      tableName: config.exchangeHistoryTableName,
    },
    params.merchantId,
    params.exchangeId,
  );

  if (!item) {
    throw new Error("対象の交換が見つかりません");
  }

  // 日程調整が進行中の交換は、終端化と同時に schedule 側も終端化して
  // ポイント返還・操作ログ追記まで 1 トランザクションで行う。
  if (isScheduleActive(item)) {
    if (params.nextStatus !== "REJECTED" && params.nextStatus !== "CANCELED") {
      throw new InvalidExchangeStatusTransitionError(
        normalizeStatus(item.status),
        params.nextStatus,
        "MERCHANT",
      );
    }

    const cancelled = await cancelScheduleWithExchange(buildScheduleServiceConfig(config), {
      item,
      exchangeNextStatus: params.nextStatus,
      reason: params.comment,
      actor: { actor: "MERCHANT", actorId: params.actorUserId, actorName: params.actorName },
      now: new Date(),
    });

    return buildExchangeDetail(config, cancelled, "MERCHANT");
  }

  const updated = await transitionExchangeStatus(
    {
      region: config.region,
      tableName: config.exchangeHistoryTableName,
    },
    {
      item,
      nextStatus: params.nextStatus,
      actorType: "MERCHANT",
      actorId: params.actorUserId,
      actorName: params.actorName,
      comment: params.comment,
      userTableName: config.userTableName,
      pointTransactionTableName: config.pointTransactionTableName,
    },
  );

  return buildExchangeDetail(config, updated, "MERCHANT");
}

async function requireExchangeForMerchant(
  config: RuntimeConfig,
  merchantId: string,
  exchangeId: string,
): Promise<ExchangeHistoryItem> {
  const item = await findExchangeHistoryByMerchantAndExchangeId(
    {
      region: config.region,
      tableName: config.exchangeHistoryTableName,
    },
    merchantId,
    exchangeId,
  );

  if (!item) {
    throw new Error("対象の交換が見つかりません");
  }

  return item;
}

async function loadMerchandiseForExchange(
  config: RuntimeConfig,
  item: ExchangeHistoryItem,
): Promise<Merchandise | null> {
  if (!item.merchantId || !item.merchandiseId) {
    return null;
  }
  return getMerchandise(
    {
      region: config.region,
      tableName: config.merchandiseTableName,
    },
    item.merchantId,
    item.merchandiseId,
  );
}

export type MerchantScheduleActor = {
  actorUserId: string;
  actorName?: string;
};

/**
 * 候補日の提示（AWAITING_PROPOSAL から）。
 * サーバー側で shipDate / selectableUntil を再計算して保存する。
 */
export async function proposeScheduleForMerchant(params: {
  merchantId: string;
  exchangeId: string;
  arrivalDates: string[];
  merchantNote?: string;
  actor: MerchantScheduleActor;
}): Promise<ExchangeDetail> {
  const config = getRuntimeConfig();
  const item = await requireExchangeForMerchant(config, params.merchantId, params.exchangeId);
  const merchandise = await loadMerchandiseForExchange(config, item);
  const { product, calendar } = await loadScheduleContext(config, item, merchandise);

  const updated = await proposeCandidates(buildScheduleServiceConfig(config), {
    item,
    arrivalDates: params.arrivalDates,
    merchantNote: params.merchantNote,
    actor: { actor: "MERCHANT", actorId: params.actor.actorUserId, actorName: params.actor.actorName },
    now: new Date(),
    product,
    calendar,
  });

  return buildExchangeDetail(config, updated, "MERCHANT");
}

/** employee の希望日への応答（承諾 / 対応不可 / 別候補を再提示） */
export async function respondScheduleForMerchant(params: {
  merchantId: string;
  exchangeId: string;
  request: RespondScheduleRequest;
  actor: MerchantScheduleActor;
}): Promise<ExchangeDetail> {
  const config = getRuntimeConfig();
  const item = await requireExchangeForMerchant(config, params.merchantId, params.exchangeId);
  const merchandise = await loadMerchandiseForExchange(config, item);
  const { product, calendar } = await loadScheduleContext(config, item, merchandise);
  const actor = { actor: "MERCHANT" as const, actorId: params.actor.actorUserId, actorName: params.actor.actorName };
  const now = new Date();
  const serviceConfig = buildScheduleServiceConfig(config);

  let updated: ExchangeHistoryItem;
  if (params.request.action === "ACCEPT") {
    updated = await acceptRequestedDate(serviceConfig, { item, actor, now, product, calendar });
  } else if (params.request.action === "REJECT") {
    updated = await rejectRequestedDate(serviceConfig, { item, reason: params.request.reason, actor, now });
  } else {
    updated = await reproposeCandidates(serviceConfig, {
      item,
      arrivalDates: params.request.arrivalDates,
      merchantNote: params.request.merchantNote,
      actor,
      now,
      product,
      calendar,
    });
  }

  return buildExchangeDetail(config, updated, "MERCHANT");
}

/**
 * 候補追加フォームのプレビュー。追加した日付の発送日・選択期限・警告をサーバー側で計算して返す。
 * 警告があってもブロックしない（臨時に発送できる日もあり、merchant の判断を優先する）。
 */
export async function previewScheduleForMerchant(params: {
  merchantId: string;
  exchangeId: string;
  arrivalDates: string[];
}): Promise<ScheduleCandidateView[]> {
  const config = getRuntimeConfig();
  const item = await requireExchangeForMerchant(config, params.merchantId, params.exchangeId);
  const merchandise = await loadMerchandiseForExchange(config, item);
  const { product, calendar } = await loadScheduleContext(config, item, merchandise);
  const now = new Date();

  return params.arrivalDates.map((arrivalDate) => buildCandidateView(arrivalDate, now, product, calendar));
}

export { InvalidExchangeStatusTransitionError };
