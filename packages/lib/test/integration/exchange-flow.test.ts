import { randomUUID } from "node:crypto";

import { describe, expect, test } from "vitest";

import {
  InsufficientPointBalanceError,
  InvalidExchangeStatusTransitionError,
  findExchangeHistoryByMerchantAndExchangeId,
  listExchangeHistoryByCompany,
  listExchangeHistoryByCompanyAndUser,
  listExchangeHistoryByMerchant,
  listExchangeHistoryByMerchantAndStatus,
  putExchangeHistoryWithReservation,
  transitionExchangeStatus,
} from "../../src/dynamodb/exchange-history";
import {
  buildExchangeRequestItem,
  createEmployee,
  exchangeHistoryTable,
  listPointTransactions,
  pointTransactionTable,
  readUser,
  requestExchangeAsEmployee,
  userTable,
} from "./setup/fixtures";

// 交換フローは 4 アプリを横断する:
//   employee が申請 → merchant / operator がステータスを進める → admin / employee が履歴を見る。
// 各アプリは同じテーブルを lib 経由で読み書きするので、ここでは lib の関数を「その役割として」順に呼ぶ。

describe("交換フロー: 従業員の申請", () => {
  test("申請すると残高が引き当てられ、各アプリの一覧から同じ交換が見える", async () => {
    const { companyId, userId, user } = await createEmployee({ currentPointBalance: 500 });
    const merchantId = `merchant-${randomUUID()}`;

    // employee
    const exchange = await requestExchangeAsEmployee({ user, merchantId, requiredPoint: 200 });

    const after = await readUser(companyId, userId);
    expect(after.currentPointBalance).toBe(300);

    // employee: 自分の履歴
    const mine = await listExchangeHistoryByCompanyAndUser(exchangeHistoryTable, companyId, userId);
    expect(mine.map((item) => item.exchangeId)).toEqual([exchange.exchangeId]);
    expect(mine[0]).toMatchObject({ status: "REQUESTED", pointHeld: 200, usedPoint: 200 });

    // admin: 会社単位の履歴
    const byCompany = await listExchangeHistoryByCompany(exchangeHistoryTable, companyId);
    expect(byCompany.map((item) => item.exchangeId)).toEqual([exchange.exchangeId]);

    // merchant: 受付待ち一覧と提携企業単位の全件
    const requested = await listExchangeHistoryByMerchantAndStatus(exchangeHistoryTable, merchantId, "REQUESTED");
    expect(requested.map((item) => item.exchangeId)).toEqual([exchange.exchangeId]);
    const byMerchant = await listExchangeHistoryByMerchant(exchangeHistoryTable, merchantId);
    expect(byMerchant.map((item) => item.exchangeId)).toEqual([exchange.exchangeId]);

    // ポイント取引が申請と対応している
    const transactions = await listPointTransactions(companyId, userId);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      type: "EXCHANGE_REQUEST",
      deltaPoint: -200,
      balanceAfter: 300,
      sourceType: "EXCHANGE_HISTORY",
      sourceId: exchange.exchangeId,
      actorType: "EMPLOYEE",
    });
  });

  test("残高が足りなければ申請できず、何も書き込まれない", async () => {
    const { companyId, userId, user } = await createEmployee({ currentPointBalance: 100 });

    await expect(
      requestExchangeAsEmployee({ user, merchantId: `merchant-${randomUUID()}`, requiredPoint: 200 }),
    ).rejects.toBeInstanceOf(InsufficientPointBalanceError);

    expect((await readUser(companyId, userId)).currentPointBalance).toBe(100);
    expect(await listExchangeHistoryByCompanyAndUser(exchangeHistoryTable, companyId, userId)).toEqual([]);
    expect(await listPointTransactions(companyId, userId)).toEqual([]);
  });

  test("同じ残高を読んだ 2 つの申請が並行しても、残高を超えて引き当てない", async () => {
    const { companyId, userId, user } = await createEmployee({ currentPointBalance: 300 });
    const merchantId = `merchant-${randomUUID()}`;

    // 1 件目は成功して残高 100 になる
    await requestExchangeAsEmployee({ user, merchantId, requiredPoint: 200 });

    // 2 件目は 1 件目より前に読んだ user（残高 300）を前提に申請する = 楽観ロック違反
    const stale = buildExchangeRequestItem({ companyId, userId, merchantId, requiredPoint: 200 });
    await expect(
      putExchangeHistoryWithReservation(exchangeHistoryTable, {
        exchange: stale,
        user: {
          tableName: userTable.tableName,
          companyId,
          userId,
          expectedCurrentPointBalance: 300,
          nextCurrentPointBalance: 100,
          updatedAt: new Date().toISOString(),
        },
      }),
    ).rejects.toBeInstanceOf(InsufficientPointBalanceError);

    // トランザクションなので交換履歴も残高も 1 件目の状態のまま
    expect((await readUser(companyId, userId)).currentPointBalance).toBe(100);
    expect(await listExchangeHistoryByCompanyAndUser(exchangeHistoryTable, companyId, userId)).toHaveLength(1);
  });
});

describe("交換フロー: 提携企業・運用者による進行", () => {
  test("提携企業が受付→対応中→完了まで進めると、状態別一覧と履歴が追従する", async () => {
    const { companyId, userId, user } = await createEmployee({ currentPointBalance: 500 });
    const merchantId = `merchant-${randomUUID()}`;
    const merchantUserId = `merchant-user-${randomUUID()}`;
    const exchange = await requestExchangeAsEmployee({ user, merchantId, requiredPoint: 200 });

    // merchant: 一覧から対象を取り出して進める（apps/merchant transitionExchangeForMerchant と同じ経路）
    let current = (await findExchangeHistoryByMerchantAndExchangeId(exchangeHistoryTable, merchantId, exchange.exchangeId))!;
    expect(current).not.toBeNull();

    for (const nextStatus of ["PREPARING", "IN_PROGRESS", "COMPLETED"] as const) {
      const previousStatus = current.status!;
      current = await transitionExchangeStatus(exchangeHistoryTable, {
        item: current,
        nextStatus,
        actorType: "MERCHANT",
        actorId: merchantUserId,
        actorName: "担当 太郎",
        userTableName: userTable.tableName,
        pointTransactionTableName: pointTransactionTable.tableName,
      });

      // 状態別 GSI: 前の状態の一覧から消え、次の状態の一覧に現れる
      const previousList = await listExchangeHistoryByMerchantAndStatus(exchangeHistoryTable, merchantId, previousStatus);
      expect(previousList.map((item) => item.exchangeId)).not.toContain(exchange.exchangeId);
      const nextList = await listExchangeHistoryByMerchantAndStatus(exchangeHistoryTable, merchantId, nextStatus);
      expect(nextList.map((item) => item.exchangeId)).toContain(exchange.exchangeId);
    }

    // admin: 会社単位の履歴から見た最終状態
    const [seenByAdmin] = await listExchangeHistoryByCompany(exchangeHistoryTable, companyId);
    expect(seenByAdmin.status).toBe("COMPLETED");
    expect(seenByAdmin.pointHeld).toBe(0);
    expect(seenByAdmin.completedAt).toBeDefined();
    expect(seenByAdmin.history?.map((event) => event.status)).toEqual([
      "REQUESTED",
      "PREPARING",
      "IN_PROGRESS",
      "COMPLETED",
    ]);
    expect(seenByAdmin.history?.slice(1).every((event) => event.actorName === "担当 太郎")).toBe(true);

    // 完了しても残高は戻らず、取引も申請の 1 件だけ
    expect((await readUser(companyId, userId)).currentPointBalance).toBe(300);
    expect(await listPointTransactions(companyId, userId)).toHaveLength(1);
  });

  test("運用者が却下すると残高が返金され、返金取引が記録される", async () => {
    const { companyId, userId, user } = await createEmployee({ currentPointBalance: 500 });
    const merchantId = `merchant-${randomUUID()}`;
    const exchange = await requestExchangeAsEmployee({ user, merchantId, requiredPoint: 200 });
    expect((await readUser(companyId, userId)).currentPointBalance).toBe(300);

    // operator
    const [item] = await listExchangeHistoryByMerchantAndStatus(exchangeHistoryTable, merchantId, "REQUESTED");
    const rejected = await transitionExchangeStatus(exchangeHistoryTable, {
      item,
      nextStatus: "REJECTED",
      actorType: "OPERATOR",
      actorId: `operator-${randomUUID()}`,
      comment: "在庫切れ",
      userTableName: userTable.tableName,
      pointTransactionTableName: pointTransactionTable.tableName,
    });

    expect(rejected.status).toBe("REJECTED");
    expect(rejected.pointHeld).toBe(0);
    expect(rejected.canceledAt).toBeDefined();

    // employee: 残高が戻っている
    expect((await readUser(companyId, userId)).currentPointBalance).toBe(500);

    // admin: 申請と返金の 2 取引が並ぶ
    const transactions = await listPointTransactions(companyId, userId);
    expect(transactions.map((tx) => tx.type).sort()).toEqual(["EXCHANGE_REFUND", "EXCHANGE_REQUEST"]);
    const refund = transactions.find((tx) => tx.type === "EXCHANGE_REFUND")!;
    expect(refund).toMatchObject({
      deltaPoint: 200,
      sourceId: exchange.exchangeId,
      actorType: "OPERATOR",
    });

    // 却下後は REQUESTED 一覧から消え REJECTED 一覧に入る
    expect(await listExchangeHistoryByMerchantAndStatus(exchangeHistoryTable, merchantId, "REQUESTED")).toEqual([]);
    expect(
      (await listExchangeHistoryByMerchantAndStatus(exchangeHistoryTable, merchantId, "REJECTED")).map(
        (candidate) => candidate.exchangeId,
      ),
    ).toEqual([exchange.exchangeId]);
  });

  test("提携企業が先に進めた交換を、運用者が古い状態のままキャンセルすることはできない", async () => {
    const { companyId, userId, user } = await createEmployee({ currentPointBalance: 500 });
    const merchantId = `merchant-${randomUUID()}`;
    await requestExchangeAsEmployee({ user, merchantId, requiredPoint: 200 });

    // merchant と operator が同じ REQUESTED の交換を画面に表示している
    const [seenByMerchant] = await listExchangeHistoryByMerchantAndStatus(exchangeHistoryTable, merchantId, "REQUESTED");
    const seenByOperator = structuredClone(seenByMerchant);

    // merchant が先に受付する
    await transitionExchangeStatus(exchangeHistoryTable, {
      item: seenByMerchant,
      nextStatus: "PREPARING",
      actorType: "MERCHANT",
      userTableName: userTable.tableName,
    });

    // operator は古い表示のままキャンセル（返金）しようとする → 楽観ロックで拒否
    await expect(
      transitionExchangeStatus(exchangeHistoryTable, {
        item: seenByOperator,
        nextStatus: "CANCELED",
        actorType: "OPERATOR",
        userTableName: userTable.tableName,
        pointTransactionTableName: pointTransactionTable.tableName,
      }),
    ).rejects.toMatchObject({ name: "TransactionCanceledException" });

    // 返金されず、状態も PREPARING のまま
    expect((await readUser(companyId, userId)).currentPointBalance).toBe(300);
    const [latest] = await listExchangeHistoryByMerchant(exchangeHistoryTable, merchantId);
    expect(latest.status).toBe("PREPARING");
    expect(latest.pointHeld).toBe(200);
    expect(await listPointTransactions(companyId, userId)).toHaveLength(1);
  });

  test("段階を飛ばす遷移は DB に触れる前に拒否される", async () => {
    const { companyId, userId, user } = await createEmployee({ currentPointBalance: 500 });
    const merchantId = `merchant-${randomUUID()}`;
    await requestExchangeAsEmployee({ user, merchantId, requiredPoint: 200 });
    const [item] = await listExchangeHistoryByMerchantAndStatus(exchangeHistoryTable, merchantId, "REQUESTED");

    await expect(
      transitionExchangeStatus(exchangeHistoryTable, {
        item,
        nextStatus: "COMPLETED",
        actorType: "MERCHANT",
        userTableName: userTable.tableName,
      }),
    ).rejects.toBeInstanceOf(InvalidExchangeStatusTransitionError);

    const [latest] = await listExchangeHistoryByCompanyAndUser(exchangeHistoryTable, companyId, userId);
    expect(latest.status).toBe("REQUESTED");
    expect(latest.history).toHaveLength(1);
  });
});
