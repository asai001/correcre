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
import { getMerchantById, listMerchants } from "@correcre/lib/dynamodb/merchant";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { createMerchandiseImageViewUrl } from "@correcre/lib/s3/merchandise-image";
import type {
  DBUserAddress,
  ExchangeHistoryActorType,
  ExchangeHistoryItem,
  ExchangeHistoryStatus,
} from "@correcre/types";

import type {
  OperatorExchangeDetail,
  OperatorExchangeFilter,
  OperatorExchangeSummary,
} from "../model/types";

type RuntimeConfig = {
  region: string;
  exchangeHistoryTableName: string;
  merchandiseTableName: string;
  merchantTableName: string;
  merchandiseImageBucketName: string;
  userTableName: string;
  companyTableName: string;
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
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchandiseImageBucketName: readRequiredServerEnv("S3_MERCHANDISE_IMAGE_BUCKET_NAME"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
    companyTableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    pointTransactionTableName: readRequiredServerEnv("DDB_POINT_TRANSACTION_TABLE_NAME"),
  };
}

async function resolveCompanyName(
  config: RuntimeConfig,
  companyId: string,
  cache: Map<string, string>,
): Promise<string | undefined> {
  if (cache.has(companyId)) {
    return cache.get(companyId);
  }

  const company = await getCompanyById(
    {
      region: config.region,
      tableName: config.companyTableName,
    },
    companyId,
  );

  const name = company ? company.shortName || company.name : undefined;
  if (name) {
    cache.set(companyId, name);
  }
  return name;
}

function normalizeStatus(value?: ExchangeHistoryStatus): ExchangeHistoryStatus {
  if (!value) return "REQUESTED";
  if (value === "CANCELLED") return "CANCELED";
  return value;
}

function compareExchangedAtDesc(left: OperatorExchangeSummary, right: OperatorExchangeSummary) {
  return right.exchangedAt.localeCompare(left.exchangedAt);
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

function toSummary(
  item: ExchangeHistoryItem,
  merchantName: string | undefined,
  userName: string | undefined,
  companyName: string | undefined,
): OperatorExchangeSummary {
  return {
    exchangeId: item.exchangeId,
    merchantId: item.merchantId ?? "",
    merchantName,
    companyId: item.companyId,
    companyName,
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
  };
}

export async function listExchangesForOperator(
  filter: OperatorExchangeFilter = "ALL",
  merchantIdFilter?: string,
): Promise<OperatorExchangeSummary[]> {
  const config = getRuntimeConfig();

  const merchantNameCache = new Map<string, string>();
  let merchantIds: string[];

  if (merchantIdFilter) {
    merchantIds = [merchantIdFilter];
    const merchant = await getMerchantById(
      { region: config.region, tableName: config.merchantTableName },
      merchantIdFilter,
    );
    if (merchant) merchantNameCache.set(merchant.merchantId, merchant.name);
  } else {
    const merchants = await listMerchants({
      region: config.region,
      tableName: config.merchantTableName,
    });
    merchantIds = merchants.map((merchant) => merchant.merchantId);
    for (const merchant of merchants) {
      merchantNameCache.set(merchant.merchantId, merchant.name);
    }
  }

  const allItems: ExchangeHistoryItem[] = [];

  for (const merchantId of merchantIds) {
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

    allItems.push(...items);
  }

  const userNameCache = new Map<string, string>();
  const companyNameCache = new Map<string, string>();
  const summaries: OperatorExchangeSummary[] = [];

  for (const item of allItems) {
    const merchantName = item.merchantId ? merchantNameCache.get(item.merchantId) : undefined;
    const userName = await resolveUserName(config, item.companyId, item.userId, userNameCache);
    const companyName = await resolveCompanyName(config, item.companyId, companyNameCache);
    summaries.push(toSummary(item, merchantName, userName, companyName));
  }

  return summaries.sort(compareExchangedAtDesc);
}

async function buildExchangeDetail(
  config: RuntimeConfig,
  item: ExchangeHistoryItem,
  actorType: ExchangeHistoryActorType,
): Promise<OperatorExchangeDetail> {
  const applicant = await resolveApplicantProfile(config, item.companyId, item.userId);
  const companyName = await resolveCompanyName(config, item.companyId, new Map());

  let merchantName: string | undefined;
  if (item.merchantId) {
    const merchant = await getMerchantById(
      { region: config.region, tableName: config.merchantTableName },
      item.merchantId,
    );
    merchantName = merchant?.name;
  }

  let merchandiseImageViewUrl: string | undefined;

  if (item.merchantId && item.merchandiseId) {
    const merchandise = await getMerchandise(
      { region: config.region, tableName: config.merchandiseTableName },
      item.merchantId,
      item.merchandiseId,
    );

    const imageRef = merchandise?.cardImage ?? merchandise?.detailImage;
    if (imageRef) {
      const { url } = await createMerchandiseImageViewUrl(
        { region: config.region, bucketName: config.merchandiseImageBucketName },
        imageRef.s3Key,
      );
      merchandiseImageViewUrl = url;
    }
  }

  const status = normalizeStatus(item.status);

  return {
    ...toSummary(item, merchantName, applicant.name, companyName),
    applicantEmail: applicant.email,
    applicantPhoneNumber: applicant.phoneNumber,
    applicantAddress: applicant.address,
    merchandiseImageViewUrl,
    history: item.history ?? [],
    allowedNextStatuses: getAllowedNextExchangeStatuses(status, actorType),
    actorType,
  };
}

export async function getExchangeDetailForOperator(
  merchantId: string,
  exchangeId: string,
): Promise<OperatorExchangeDetail | null> {
  const config = getRuntimeConfig();

  const item = await findExchangeHistoryByMerchantAndExchangeId(
    { region: config.region, tableName: config.exchangeHistoryTableName },
    merchantId,
    exchangeId,
  );

  if (!item) return null;

  return buildExchangeDetail(config, item, "OPERATOR");
}

export async function transitionExchangeForOperator(params: {
  merchantId: string;
  exchangeId: string;
  actorUserId: string;
  nextStatus: ExchangeHistoryStatus;
  comment?: string;
}): Promise<OperatorExchangeDetail> {
  const config = getRuntimeConfig();

  const item = await findExchangeHistoryByMerchantAndExchangeId(
    { region: config.region, tableName: config.exchangeHistoryTableName },
    params.merchantId,
    params.exchangeId,
  );

  if (!item) {
    throw new Error("対象の交換が見つかりません");
  }

  const updated = await transitionExchangeStatus(
    { region: config.region, tableName: config.exchangeHistoryTableName },
    {
      item,
      nextStatus: params.nextStatus,
      actorType: "OPERATOR",
      actorId: params.actorUserId,
      comment: params.comment,
      userTableName: config.userTableName,
      pointTransactionTableName: config.pointTransactionTableName,
    },
  );

  return buildExchangeDetail(config, updated, "OPERATOR");
}

export { InvalidExchangeStatusTransitionError };
