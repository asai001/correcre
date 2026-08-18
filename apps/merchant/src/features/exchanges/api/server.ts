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
import { listMerchantUsersByMerchant } from "@correcre/lib/dynamodb/merchant-user";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { createMerchandiseImageViewUrl } from "@correcre/lib/s3/merchandise-image";
import { joinNameParts } from "@correcre/lib/user-profile";
import type {
  DBUserAddress,
  ExchangeHistoryActorType,
  ExchangeHistoryItem,
  ExchangeHistoryStatus,
  ExchangeHistoryStatusEvent,
} from "@correcre/types";

import type {
  ExchangeDetail,
  ExchangeListFilter,
  ExchangeSummary,
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

async function buildExchangeDetail(
  config: RuntimeConfig,
  item: ExchangeHistoryItem,
  actorType: ExchangeHistoryActorType,
): Promise<ExchangeDetail> {
  const applicant = await resolveApplicantProfile(config, item.companyId, item.userId);

  let merchandiseImageViewUrl: string | undefined;

  if (item.merchantId && item.merchandiseId) {
    const merchandise = await getMerchandise(
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

  return {
    ...toSummary(item, applicant.name, merchantActorNames),
    merchantId: item.merchantId ?? "",
    companyName,
    applicantEmail: applicant.email,
    applicantPhoneNumber: applicant.phoneNumber,
    applicantAddress: applicant.address,
    merchandiseImageViewUrl,
    history,
    allowedNextStatuses: getAllowedNextExchangeStatuses(status, actorType),
    actorType,
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

export { InvalidExchangeStatusTransitionError };
