import { randomUUID } from "node:crypto";

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { DBUserItem, ExchangeHistoryItem, ExchangeHistoryStatusEvent, PointTransaction } from "@correcre/types";

import { getDynamoDocumentClient } from "../../../src/dynamodb/client";
import {
  InsufficientPointBalanceError,
  buildExchangeHistoryByCompanyGsiPk,
  buildExchangeHistoryByCompanyGsiSk,
  buildExchangeHistoryByMerchantGsiPk,
  buildExchangeHistoryByMerchantGsiSk,
  buildExchangeHistoryByMerchantStatusGsiPk,
  buildExchangeHistoryPk,
  buildExchangeHistorySk,
  putExchangeHistoryWithReservation,
} from "../../../src/dynamodb/exchange-history";
import { buildPointTransactionPk, createPointTransaction } from "../../../src/dynamodb/point-transaction";
import { buildUserSk, getUserByCompanyAndUserId, putUser } from "../../../src/dynamodb/user";
import { reflectPoints } from "../../../src/points-reflection";
import { TEST_REGION, testTableName } from "./cdk-tables";

// 各アプリが環境変数から組み立てているテーブル設定を、テスト用に固定したもの。
export const userTable = { region: TEST_REGION, tableName: testTableName("user") };
export const exchangeHistoryTable = { region: TEST_REGION, tableName: testTableName("exchange-history") };
export const pointTransactionTable = { region: TEST_REGION, tableName: testTableName("point-transaction") };

// "YYYY-MM" の前月。
export function previousMonthYYYYMM(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

export type EmployeeFixture = {
  companyId: string;
  userId: string;
  user: DBUserItem;
};

// 従業員ユーザーを 1 人作る。companyId / userId は毎回ユニークにして、他テストと干渉しないようにする。
export async function createEmployee(input: {
  currentPointBalance: number;
  pendingPointBalance?: number;
  pendingPointYearMonth?: string;
}): Promise<EmployeeFixture> {
  const companyId = `company-${randomUUID()}`;
  const userId = `user-${randomUUID()}`;
  const now = new Date().toISOString();
  const user: DBUserItem = {
    companyId,
    sk: buildUserSk(userId),
    userId,
    lastName: "テスト",
    firstName: "従業員",
    email: `${userId}@example.com`,
    roles: ["EMPLOYEE"],
    status: "ACTIVE",
    currentPointBalance: input.currentPointBalance,
    ...(input.pendingPointBalance !== undefined ? { pendingPointBalance: input.pendingPointBalance } : {}),
    ...(input.pendingPointYearMonth !== undefined ? { pendingPointYearMonth: input.pendingPointYearMonth } : {}),
    currentMonthCompletionRate: 0,
    createdAt: now,
    updatedAt: now,
    gsi2pk: `EMAIL#${userId}@example.com`,
  };

  await putUser(userTable, user);

  return { companyId, userId, user };
}

export async function readUser(companyId: string, userId: string): Promise<DBUserItem> {
  const user = await getUserByCompanyAndUserId(userTable, companyId, userId);
  if (!user) {
    throw new Error(`user not found: ${companyId}/${userId}`);
  }
  return user;
}

export function buildExchangeRequestItem(input: {
  companyId: string;
  userId: string;
  merchantId: string;
  requiredPoint: number;
  merchandiseName?: string;
  now?: string;
}): ExchangeHistoryItem {
  const now = input.now ?? new Date().toISOString();
  const exchangeId = randomUUID();
  const merchandiseId = `merchandise-${randomUUID()}`;
  const initialEvent: ExchangeHistoryStatusEvent = {
    status: "REQUESTED",
    occurredAt: now,
    actorType: "EMPLOYEE",
    actorId: input.userId,
  };

  // apps/employee の requestExchangeForEmployee が保存する形と同じ。
  return {
    pk: buildExchangeHistoryPk(input.companyId, input.userId),
    sk: buildExchangeHistorySk(now, exchangeId),
    exchangeId,
    companyId: input.companyId,
    userId: input.userId,
    merchandiseId,
    merchandiseNameSnapshot: input.merchandiseName ?? "テスト商品",
    merchantId: input.merchantId,
    merchantNameSnapshot: "テスト提携企業",
    usedPoint: input.requiredPoint,
    requiredPointSnapshot: input.requiredPoint,
    priceYenSnapshot: input.requiredPoint * 5,
    pointHeld: input.requiredPoint,
    status: "REQUESTED",
    history: [initialEvent],
    exchangedAt: now,
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
    gsi1pk: buildExchangeHistoryByCompanyGsiPk(input.companyId),
    gsi1sk: buildExchangeHistoryByCompanyGsiSk(now, input.userId, exchangeId),
    gsi2pk: buildExchangeHistoryByMerchantStatusGsiPk(input.merchantId, "REQUESTED"),
    gsi2sk: buildExchangeHistoryByMerchantGsiSk(now, exchangeId),
    gsi3pk: buildExchangeHistoryByMerchantGsiPk(input.merchantId),
    gsi3sk: buildExchangeHistoryByMerchantGsiSk(now, exchangeId),
  };
}

// 従業員アプリの交換申請 (apps/employee requestExchangeForEmployee) の書き込み経路を再現する。
// - 読み取り時点のユーザーに翌月反映を適用し、利用可能残高で判定する
// - 交換履歴の作成・残高の引き当て・ポイント取引の記録を 1 トランザクションで確定する
// メール通知や S3 の署名 URL 生成はアプリ層の責務なので、ここでは扱わない。
export async function requestExchangeAsEmployee(input: {
  user: DBUserItem;
  merchantId: string;
  requiredPoint: number;
  merchandiseName?: string;
  currentYearMonth?: string;
  now?: string;
}): Promise<ExchangeHistoryItem> {
  const now = input.now ?? new Date().toISOString();
  const reflected = reflectPoints(input.user, input.currentYearMonth);

  if (reflected.spendablePoint < input.requiredPoint) {
    throw new InsufficientPointBalanceError();
  }

  const exchange = buildExchangeRequestItem({
    companyId: input.user.companyId,
    userId: input.user.userId,
    merchantId: input.merchantId,
    requiredPoint: input.requiredPoint,
    merchandiseName: input.merchandiseName,
    now,
  });
  const nextBalance = reflected.spendablePoint - input.requiredPoint;

  await putExchangeHistoryWithReservation(exchangeHistoryTable, {
    exchange,
    user: {
      tableName: userTable.tableName,
      companyId: input.user.companyId,
      userId: input.user.userId,
      expectedCurrentPointBalance: input.user.currentPointBalance ?? 0,
      nextCurrentPointBalance: nextBalance,
      updatedAt: now,
      expectedPendingPointBalance: input.user.pendingPointBalance,
      expectedPendingPointYearMonth: input.user.pendingPointYearMonth,
      ...(reflected.changed ? { nextPendingPointBalance: 0, clearPendingPointYearMonth: true } : {}),
    },
    pointTransaction: {
      tableName: pointTransactionTable.tableName,
      transaction: createPointTransaction({
        companyId: input.user.companyId,
        userId: input.user.userId,
        transactionId: randomUUID(),
        occurredAt: now,
        type: "EXCHANGE_REQUEST",
        deltaPoint: -input.requiredPoint,
        balanceAfter: nextBalance,
        sourceType: "EXCHANGE_HISTORY",
        sourceId: exchange.exchangeId,
        actorType: "EMPLOYEE",
        actorUserId: input.user.userId,
        description: exchange.merchandiseNameSnapshot,
      }),
    },
  });

  return exchange;
}

export async function listPointTransactions(companyId: string, userId: string): Promise<PointTransaction[]> {
  const client = getDynamoDocumentClient(TEST_REGION);
  const { Items } = await client.send(
    new QueryCommand({
      TableName: pointTransactionTable.tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": buildPointTransactionPk(companyId, userId) },
    }),
  );
  return (Items ?? []) as PointTransaction[];
}
