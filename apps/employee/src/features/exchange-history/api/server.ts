import { listExchangeHistoryByCompanyAndUser } from "@correcre/lib/dynamodb/exchange-history";
import { getMerchandise } from "@correcre/lib/dynamodb/merchandise";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { ExchangeHistoryItem } from "@correcre/types";

import type { ExchangeHistory } from "../model/types";

function isWithinDateRange(dateTime: string, startDate?: string, endDate?: string) {
  const date = dateTime.slice(0, 10);
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

export async function getExchangeHistoryFromDynamo(
  companyId: string,
  userId: string,
  startDate?: string,
  endDate?: string,
  limit?: number,
): Promise<ExchangeHistory[]> {
  const items = await listExchangeHistoryByCompanyAndUser(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_EXCHANGE_HISTORY_TABLE_NAME"),
    },
    companyId,
    userId,
  );

  const sortedItems = items
    .filter((item) => isWithinDateRange(item.exchangedAt, startDate, endDate))
    .sort((a, b) => (a.exchangedAt < b.exchangedAt ? 1 : -1));
  const pickedItems = typeof limit === "number" ? sortedItems.slice(0, limit) : sortedItems;

  const reservationRequiredByExchangeId = await resolveReservationRequired(pickedItems);

  return pickedItems.map((item) => ({
    date: item.exchangedAt.slice(0, 10),
    exchangeId: item.exchangeId,
    merchantName: item.merchantNameSnapshot,
    merchandiseName: item.merchandiseNameSnapshot,
    usedPoint: item.usedPoint,
    status: item.status,
    scheduleStatus: item.schedule?.scheduleStatus,
    selectedArrivalDate: item.schedule?.selectedArrivalDate,
    reservationRequired: reservationRequiredByExchangeId.get(item.exchangeId),
  }));
}

// 予約が必要な商品（サロン等）の交換に、一覧から予約案内へのリンクを出すための判定。
// 同じ商品はまとめて 1 回だけ引く。取得に失敗しても一覧表示自体は止めない。
async function resolveReservationRequired(
  items: ExchangeHistoryItem[],
): Promise<Map<string, boolean>> {
  const config = {
    region: readRequiredServerEnv("AWS_REGION"),
    tableName: readRequiredServerEnv("DDB_MERCHANDISE_TABLE_NAME"),
  };

  const merchandiseKeys = new Map<string, { merchantId: string; merchandiseId: string }>();
  for (const item of items) {
    if (item.merchantId && item.merchandiseId) {
      merchandiseKeys.set(`${item.merchantId}#${item.merchandiseId}`, {
        merchantId: item.merchantId,
        merchandiseId: item.merchandiseId,
      });
    }
  }

  const requiredByMerchandiseKey = new Map<string, boolean>();
  await Promise.all(
    [...merchandiseKeys.entries()].map(async ([key, { merchantId, merchandiseId }]) => {
      try {
        const merchandise = await getMerchandise(config, merchantId, merchandiseId);
        requiredByMerchandiseKey.set(key, Boolean(merchandise?.reservation));
      } catch (error) {
        console.error("Failed to resolve merchandise reservation for exchange history.", {
          error,
          merchantId,
          merchandiseId,
        });
        requiredByMerchandiseKey.set(key, false);
      }
    }),
  );

  const result = new Map<string, boolean>();
  for (const item of items) {
    if (item.merchantId && item.merchandiseId) {
      result.set(
        item.exchangeId,
        requiredByMerchandiseKey.get(`${item.merchantId}#${item.merchandiseId}`) ?? false,
      );
    }
  }
  return result;
}
