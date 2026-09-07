import { randomUUID } from "node:crypto";

import { describe, expect, test } from "vitest";

import { nowYYYYMM } from "../../src/date/format";
import { InsufficientPointBalanceError, putExchangeHistoryWithReservation } from "../../src/dynamodb/exchange-history";
import { putUser } from "../../src/dynamodb/user";
import {
  buildExchangeRequestItem,
  createEmployee,
  exchangeHistoryTable,
  listPointTransactions,
  previousMonthYYYYMM,
  readUser,
  requestExchangeAsEmployee,
  userTable,
} from "./setup/fixtures";

// ポイントの「翌月反映」は、ミッション報酬を付与する admin / operator 側が pending に積み、
// employee 側が読み取り時に reflectPoints で繰り入れて使う、という分担になっている。
// 繰り入れの永続化は employee の交換申請と同じトランザクションで行われるので、その経路を検証する。

describe("ポイント翌月反映と交換申請", () => {
  test("前月に獲得した pending は反映後残高として使え、反映結果が保存される", async () => {
    const thisMonth = nowYYYYMM();
    const { companyId, userId, user } = await createEmployee({
      currentPointBalance: 100,
      pendingPointBalance: 300,
      pendingPointYearMonth: previousMonthYYYYMM(thisMonth),
    });

    // 反映後の利用可能残高 400 のうち 250 を使う
    const exchange = await requestExchangeAsEmployee({
      user,
      merchantId: `merchant-${randomUUID()}`,
      requiredPoint: 250,
      currentYearMonth: thisMonth,
    });

    const after = await readUser(companyId, userId);
    expect(after.currentPointBalance).toBe(150);
    expect(after.pendingPointBalance).toBe(0);
    expect(after.pendingPointYearMonth).toBeUndefined();

    const [transaction] = await listPointTransactions(companyId, userId);
    expect(transaction).toMatchObject({ deltaPoint: -250, balanceAfter: 150, sourceId: exchange.exchangeId });
  });

  test("当月に獲得した pending はまだ使えない", async () => {
    const thisMonth = nowYYYYMM();
    const { companyId, userId, user } = await createEmployee({
      currentPointBalance: 100,
      pendingPointBalance: 300,
      pendingPointYearMonth: thisMonth,
    });

    await expect(
      requestExchangeAsEmployee({
        user,
        merchantId: `merchant-${randomUUID()}`,
        requiredPoint: 250,
        currentYearMonth: thisMonth,
      }),
    ).rejects.toBeInstanceOf(InsufficientPointBalanceError);

    const after = await readUser(companyId, userId);
    expect(after.currentPointBalance).toBe(100);
    expect(after.pendingPointBalance).toBe(300);
    expect(after.pendingPointYearMonth).toBe(thisMonth);
  });

  test("反映処理と並行して pending が更新されていた場合は、古い pending を 0 で上書きしない", async () => {
    const thisMonth = nowYYYYMM();
    const lastMonth = previousMonthYYYYMM(thisMonth);
    const { companyId, userId, user } = await createEmployee({
      currentPointBalance: 100,
      pendingPointBalance: 300,
      pendingPointYearMonth: lastMonth,
    });

    // employee が画面を開いた後、admin がミッション報酬を確定して pending が 300 → 350 になった、という状況を作る。
    // 実際の付与処理は pending への加算だが、ここでは結果の状態だけを作る。
    await putUser(userTable, { ...user, pendingPointBalance: 350 });

    // employee は古い user（pending 300）を前提に反映込みの申請を送る → pending の楽観ロックで拒否
    const stale = buildExchangeRequestItem({ companyId, userId, merchantId: `merchant-${randomUUID()}`, requiredPoint: 250 });
    await expect(
      putExchangeHistoryWithReservation(exchangeHistoryTable, {
        exchange: stale,
        user: {
          tableName: userTable.tableName,
          companyId,
          userId,
          expectedCurrentPointBalance: 100,
          nextCurrentPointBalance: 150,
          updatedAt: new Date().toISOString(),
          expectedPendingPointBalance: 300,
          expectedPendingPointYearMonth: lastMonth,
          nextPendingPointBalance: 0,
          clearPendingPointYearMonth: true,
        },
      }),
    ).rejects.toBeInstanceOf(InsufficientPointBalanceError);

    // 加算された 350 が失われていない
    const after = await readUser(companyId, userId);
    expect(after.currentPointBalance).toBe(100);
    expect(after.pendingPointBalance).toBe(350);
    expect(after.pendingPointYearMonth).toBe(lastMonth);
  });
});
