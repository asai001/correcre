import "server-only";

import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { listExchangeHistoryByMerchant } from "@correcre/lib/dynamodb/exchange-history";
import { listMerchandiseByMerchant, updateMerchandiseStatus } from "@correcre/lib/dynamodb/merchandise";
import { getMerchantById, putMerchant } from "@correcre/lib/dynamodb/merchant";
import { listMerchantUsersByMerchant, updateMerchantUserStatus } from "@correcre/lib/dynamodb/merchant-user";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  isMerchantDeletionConfirmed,
  isOpenExchangeForMerchantDeletion,
  MERCHANT_DELETION_CANCEL_COMMENT,
  planMerchantDeletionCancellation,
} from "@correcre/lib/merchant/deletion";
import { notifyEmployeeExchangeCanceledByMerchantDeletion } from "@correcre/lib/notification/exchange-events";
import { joinNameParts } from "@correcre/lib/user-profile";
import type { DBUserItem, ExchangeHistoryItem, Merchant } from "@correcre/types";

import { transitionExchangeForOperator } from "@operator/features/exchange-management/api/server";

import type {
  DeleteMerchantInput,
  DeleteMerchantResult,
  MerchantDeletionExchange,
  MerchantDeletionPreview,
} from "../model/types";
import { recordMerchantDeletedAuditLog } from "./server";

// 提携企業の削除（論理削除）。レコードは残して status を DELETED にし、
// - 管理一覧から外す
// - 商品を非公開にして交換できなくする
// - 提携企業ユーザーを削除済みにしてログインできなくする
// 交換履歴は残るため、申請者への連絡や過去の収支の確認は削除後もできる。

export class MerchantNotFoundError extends Error {
  constructor() {
    super("提携企業が見つかりません");
    this.name = "MerchantNotFoundError";
  }
}

export class MerchantAlreadyDeletedError extends Error {
  constructor() {
    super("この提携企業はすでに削除されています");
    this.name = "MerchantAlreadyDeletedError";
  }
}

export class MerchantDeletionNotConfirmedError extends Error {
  constructor() {
    super("確認のため、提携企業名を正しく入力してください");
    this.name = "MerchantDeletionNotConfirmedError";
  }
}

export class MerchantHasOpenExchangesError extends Error {
  constructor(public readonly openExchanges: MerchantDeletionExchange[]) {
    super(`対応中の交換が ${openExchanges.length} 件残っています。キャンセルして削除する場合は「強制削除」を選んでください`);
    this.name = "MerchantHasOpenExchangesError";
  }
}

export class MerchantDeletionCancellationError extends Error {
  constructor(
    public readonly cancelled: MerchantDeletionExchange[],
    public readonly failedExchangeIds: string[],
  ) {
    super(
      `交換 ${failedExchangeIds.length} 件のキャンセルに失敗したため、提携企業は削除していません。` +
        "時間をおいて再度お試しください（キャンセル済みの交換はそのままです）",
    );
    this.name = "MerchantDeletionCancellationError";
  }
}

function getRuntimeConfig() {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchantUserTableName: readRequiredServerEnv("DDB_MERCHANT_USER_TABLE_NAME"),
    merchandiseTableName: readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME"),
    exchangeHistoryTableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
    companyTableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
  };
}

type RuntimeConfig = ReturnType<typeof getRuntimeConfig>;

async function getDeletableMerchant(config: RuntimeConfig, merchantId: string): Promise<Merchant> {
  const merchant = await getMerchantById({ region: config.region, tableName: config.merchantTableName }, merchantId);
  if (!merchant) {
    throw new MerchantNotFoundError();
  }
  if (merchant.status === "DELETED") {
    throw new MerchantAlreadyDeletedError();
  }
  return merchant;
}

// 対応中の交換に、申請者の名前・メールアドレス・所属企業を添える。
async function describeExchanges(
  config: RuntimeConfig,
  exchanges: ExchangeHistoryItem[],
): Promise<MerchantDeletionExchange[]> {
  const companyNames = new Map<string, Promise<string | undefined>>();
  const resolveCompanyName = (companyId: string) => {
    if (!companyNames.has(companyId)) {
      companyNames.set(
        companyId,
        getCompanyById({ region: config.region, tableName: config.companyTableName }, companyId)
          .then((company) => company?.shortName || company?.name)
          .catch(() => undefined),
      );
    }
    return companyNames.get(companyId)!;
  };

  return Promise.all(
    exchanges.map(async (exchange): Promise<MerchantDeletionExchange> => {
      const [user, companyName] = await Promise.all([
        getUserByCompanyAndUserId(
          { region: config.region, tableName: config.userTableName },
          exchange.companyId,
          exchange.userId,
        ).catch(() => null),
        resolveCompanyName(exchange.companyId),
      ]);

      return {
        exchangeId: exchange.exchangeId,
        status: exchange.status ?? "REQUESTED",
        merchandiseName: exchange.merchandiseNameSnapshot,
        usedPoint: exchange.usedPoint,
        exchangedAt: exchange.exchangedAt,
        applicantName: (user && joinNameParts(user.lastName, user.firstName)) || user?.email || exchange.userId,
        applicantEmail: user?.email,
        companyName,
      };
    }),
  );
}

async function listOpenExchanges(config: RuntimeConfig, merchantId: string): Promise<ExchangeHistoryItem[]> {
  const exchanges = await listExchangeHistoryByMerchant(
    { region: config.region, tableName: config.exchangeHistoryTableName },
    merchantId,
  );
  return exchanges
    .filter(isOpenExchangeForMerchantDeletion)
    .sort((left, right) => left.exchangedAt.localeCompare(right.exchangedAt));
}

export async function getMerchantDeletionPreview(merchantId: string): Promise<MerchantDeletionPreview> {
  const config = getRuntimeConfig();
  const merchant = await getDeletableMerchant(config, merchantId);

  const [openExchanges, merchandise, users] = await Promise.all([
    listOpenExchanges(config, merchantId).then((items) => describeExchanges(config, items)),
    listMerchandiseByMerchant({ region: config.region, tableName: config.merchandiseTableName }, merchantId),
    listMerchantUsersByMerchant({ region: config.region, tableName: config.merchantUserTableName }, merchantId),
  ]);

  return {
    merchantId,
    merchantName: merchant.name,
    status: merchant.status,
    openExchanges,
    merchandiseCount: merchandise.length,
    publishedMerchandiseCount: merchandise.filter((item) => item.status === "PUBLISHED").length,
    userCount: users.filter((user) => user.status !== "DELETED").length,
  };
}

export async function deleteMerchantForOperator(
  input: DeleteMerchantInput,
  operator: DBUserItem,
): Promise<DeleteMerchantResult> {
  const config = getRuntimeConfig();
  const merchant = await getDeletableMerchant(config, input.merchantId);

  if (!isMerchantDeletionConfirmed(merchant.name, input.confirmName)) {
    throw new MerchantDeletionNotConfirmedError();
  }

  const openItems = await listOpenExchanges(config, merchant.merchantId);
  const openExchanges = await describeExchanges(config, openItems);

  if (openExchanges.length > 0 && !input.force) {
    throw new MerchantHasOpenExchangesError(openExchanges);
  }

  const operatorName = joinNameParts(operator.lastName, operator.firstName) || operator.email;

  // 1. 対応中の交換をキャンセルしてポイントを返す。1 件でも失敗したら削除まで進めない
  //    （取り残された交換の申請者に連絡できなくなるため）。キャンセル済みの交換は次の実行で対象から外れる。
  const cancelled: DeleteMerchantResult["cancelledExchanges"] = [];
  const failedExchangeIds: string[] = [];

  for (const [index, item] of openItems.entries()) {
    try {
      for (const nextStatus of planMerchantDeletionCancellation(item.status)) {
        await transitionExchangeForOperator({
          merchantId: merchant.merchantId,
          exchangeId: item.exchangeId,
          actorUserId: operator.userId,
          actorName: operatorName,
          nextStatus,
          comment: MERCHANT_DELETION_CANCEL_COMMENT,
        });
      }
    } catch (error) {
      console.error("Failed to cancel exchange while deleting merchant.", {
        error,
        merchantId: merchant.merchantId,
        exchangeId: item.exchangeId,
      });
      failedExchangeIds.push(item.exchangeId);
      continue;
    }

    const description = openExchanges[index];
    const notified =
      input.notifyApplicants && description.applicantEmail
        ? await notifyEmployeeExchangeCanceledByMerchantDeletion({
            region: config.region,
            recipient: description.applicantEmail,
            exchange: item,
          })
        : false;
    cancelled.push({ ...description, notified });
  }

  if (failedExchangeIds.length > 0) {
    await recordMerchantDeletedAuditLog({
      operator,
      merchant,
      result: "FAILURE",
      errorMessage: `exchange cancellation failed: ${failedExchangeIds.join(", ")}`,
    });
    throw new MerchantDeletionCancellationError(cancelled, failedExchangeIds);
  }

  const now = new Date().toISOString();

  // 2. 商品を非公開にして、従業員のカタログと交換申請から外す。
  const merchandise = await listMerchandiseByMerchant(
    { region: config.region, tableName: config.merchandiseTableName },
    merchant.merchantId,
  );
  for (const item of merchandise) {
    if (item.status === "PUBLISHED") {
      await updateMerchandiseStatus(
        { region: config.region, tableName: config.merchandiseTableName },
        merchant.merchantId,
        item.merchandiseId,
        "UNPUBLISHED",
        { updatedAt: now },
      );
    }
  }

  // 3. 提携企業ユーザーを削除済みにして、提携企業画面にログインできなくする。
  const users = await listMerchantUsersByMerchant(
    { region: config.region, tableName: config.merchantUserTableName },
    merchant.merchantId,
  );
  for (const user of users) {
    if (user.status !== "DELETED") {
      await updateMerchantUserStatus(
        { region: config.region, tableName: config.merchantUserTableName },
        merchant.merchantId,
        user.userId,
        "DELETED",
        now,
      );
    }
  }

  // 4. 提携企業を削除済みにする。
  await putMerchant(
    { region: config.region, tableName: config.merchantTableName },
    { ...merchant, status: "DELETED", deletedAt: now, deletedBy: operator.userId, updatedAt: now },
  );

  await recordMerchantDeletedAuditLog({ operator, merchant, result: "SUCCESS" });

  return {
    merchantId: merchant.merchantId,
    merchantName: merchant.name,
    cancelledExchanges: cancelled,
  };
}
