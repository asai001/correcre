import "server-only";

import { addCalendarDays } from "@correcre/lib/date/business-days";
import { nowYYYYMMDD } from "@correcre/lib/date/format";
import {
  listConfirmedExchangesByArrivalDate,
  listExchangeHistoryByScheduleStatus,
} from "@correcre/lib/dynamodb/exchange-history";
import { getMerchandise } from "@correcre/lib/dynamodb/merchandise";
import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { getMerchantCalendar } from "@correcre/lib/dynamodb/merchant-calendar";
import { getUserByCompanyAndUserId } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  resolveMerchantScheduleRecipients,
  sendEmployeeArrivalReminderEmail,
  sendEmployeeScheduleCancelledEmail,
  sendEmployeeSelectionRequestEmail,
  sendEmployeeSelectionReminderEmail,
  sendMerchantProposalReminderEmail,
  sendMerchantResponseReminderEmail,
} from "@correcre/lib/notification/schedule-events";
import { generateCandidates, isSelectable } from "@correcre/lib/schedule/engine";
import {
  cancelScheduleWithExchange,
  clearScheduleReminderSent,
  markScheduleReminderSent,
  removeScheduleGsiKeys,
  reproposeCandidates,
  type ScheduleReminderField,
  type ScheduleServiceConfig,
} from "@correcre/lib/schedule/service";
import type { ExchangeHistoryItem } from "@correcre/types";
import { resolveMerchandiseFulfillment, SCHEDULE_PROPOSAL_ROUND_LIMIT } from "@correcre/types";

// 配送日程調整の日次バッチ。
// - 申請 24h 無反応の merchant への候補提示の再通知
// - 選択期限 24h 前の employee への催促
// - 全候補期限切れの AWAITING_SELECTION の候補再生成（上限到達時はキャンセル + ポイント返還）
// - 応答期限（48h）超過の AWAITING_MERCHANT_RESPONSE への督促、さらに 48h で自動キャンセル
// - 確定日前日の employee への受取リマインド（受取失敗を防ぐ要）
// 日次実行のため、時間ベースの判定（24h / 48h）は日単位の近似になる。

const HOUR_MS = 60 * 60 * 1000;

type RuntimeConfig = {
  region: string;
  exchangeHistoryTableName: string;
  merchandiseTableName: string;
  merchantTableName: string;
  merchantUserTableName?: string;
  merchantCalendarTableName: string;
  userTableName: string;
  pointTransactionTableName: string;
  scheduleEventTableName: string;
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
    merchantTableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    merchantUserTableName: readOptionalServerEnv("DDB_MERCHANT_USER_TABLE_NAME"),
    merchantCalendarTableName: readRequiredServerEnv("DDB_MERCHANT_CALENDAR_TABLE_NAME"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
    pointTransactionTableName: readRequiredServerEnv("DDB_POINT_TRANSACTION_TABLE_NAME"),
    scheduleEventTableName: readRequiredServerEnv("DDB_SCHEDULE_EVENT_TABLE_NAME"),
  };
}

function buildServiceConfig(config: RuntimeConfig): ScheduleServiceConfig {
  return {
    region: config.region,
    exchangeHistoryTableName: config.exchangeHistoryTableName,
    scheduleEventTableName: config.scheduleEventTableName,
    userTableName: config.userTableName,
    pointTransactionTableName: config.pointTransactionTableName,
  };
}

export type DeliveryScheduleBatchResult = {
  proposalReminders: number;
  selectionReminders: number;
  regenerated: number;
  cancelled: number;
  responseReminders: number;
  arrivalReminders: number;
  cleanedUp: number;
  errors: number;
};

export async function runDeliveryScheduleBatch(now: Date = new Date()): Promise<DeliveryScheduleBatchResult> {
  const config = getRuntimeConfig();
  const serviceConfig = buildServiceConfig(config);
  const exchangeConfig = { region: config.region, tableName: config.exchangeHistoryTableName };

  const result: DeliveryScheduleBatchResult = {
    proposalReminders: 0,
    selectionReminders: 0,
    regenerated: 0,
    cancelled: 0,
    responseReminders: 0,
    arrivalReminders: 0,
    cleanedUp: 0,
    errors: 0,
  };

  const merchantRecipientCache = new Map<string, string[]>();

  const resolveMerchantRecipients = async (merchantId: string | undefined): Promise<string[]> => {
    if (!merchantId) return [];
    const cached = merchantRecipientCache.get(merchantId);
    if (cached) return cached;
    const merchant = await getMerchantById(
      { region: config.region, tableName: config.merchantTableName },
      merchantId,
    );
    const recipients = await resolveMerchantScheduleRecipients(
      { region: config.region, merchantUserTableName: config.merchantUserTableName },
      merchant,
    );
    merchantRecipientCache.set(merchantId, recipients);
    return recipients;
  };

  const resolveEmployeeEmail = async (item: ExchangeHistoryItem): Promise<string | undefined> => {
    const user = await getUserByCompanyAndUserId(
      { region: config.region, tableName: config.userTableName },
      item.companyId,
      item.userId,
    );
    return user?.email?.trim() || undefined;
  };

  // 送信済みマーカーを立ててから通知を送る。多重送信は防ぎつつ、
  // 送信に失敗したらマーカーを戻して次回のバッチで再送できるようにする
  // （立てっぱなしにすると、特に確定日前日のリマインドが二度と送られない）。
  const sendOnce = async (
    item: ExchangeHistoryItem,
    field: ScheduleReminderField,
    send: () => Promise<void>,
  ): Promise<boolean> => {
    if (!(await markScheduleReminderSent(serviceConfig, { item, field, sentAt: now.toISOString() }))) {
      return false;
    }

    try {
      await send();
      return true;
    } catch (error) {
      await clearScheduleReminderSent(serviceConfig, { item, field }).catch((clearError) => {
        console.error("delivery-schedule batch: failed to roll back reminder marker.", {
          clearError,
          exchangeId: item.exchangeId,
          field,
        });
      });
      throw error;
    }
  };

  const cancelWithNotice = async (item: ExchangeHistoryItem, reason: string) => {
    const cancelled = await cancelScheduleWithExchange(serviceConfig, {
      item,
      exchangeNextStatus: "CANCELED",
      reason,
      actor: { actor: "SYSTEM" },
      now,
      deadlineExpired: true,
    });
    result.cancelled += 1;

    try {
      const recipient = await resolveEmployeeEmail(cancelled);
      if (recipient) {
        await sendEmployeeScheduleCancelledEmail({
          config: { region: config.region },
          recipient,
          exchange: cancelled,
          refundPoint: item.pointHeld ?? 0,
          reason,
        });
      }
    } catch (error) {
      console.error("Failed to send schedule cancelled notification.", { error, exchangeId: item.exchangeId });
    }
  };

  // 1. 申請 24h 無反応 → merchant へ候補提示の再通知
  for (const item of await listExchangeHistoryByScheduleStatus(exchangeConfig, "AWAITING_PROPOSAL")) {
    try {
      const schedule = item.schedule;
      if (!schedule || schedule.proposalReminderSentAt) continue;

      const requestedAt = Date.parse(item.requestedAt ?? item.exchangedAt);
      if (!Number.isFinite(requestedAt) || now.getTime() - requestedAt < 24 * HOUR_MS) continue;

      const sent = await sendOnce(item, "proposalReminderSentAt", async () => {
        const recipients = await resolveMerchantRecipients(item.merchantId);
        if (recipients.length > 0) {
          await sendMerchantProposalReminderEmail({ config: { region: config.region }, recipients, exchange: item });
        }
      });
      if (sent) result.proposalReminders += 1;
    } catch (error) {
      result.errors += 1;
      console.error("delivery-schedule batch: proposal reminder failed.", { error, exchangeId: item.exchangeId });
    }
  }

  // 2. AWAITING_SELECTION: 全候補期限切れの再生成 / 選択期限 24h 前の催促
  for (const item of await listExchangeHistoryByScheduleStatus(exchangeConfig, "AWAITING_SELECTION")) {
    try {
      const schedule = item.schedule;
      if (!schedule) continue;

      const selectable = schedule.candidates.filter((candidate) => isSelectable(candidate, now));

      if (selectable.length === 0) {
        // 全候補が期限切れ。商品はまだ動いておらず employee が選びそびれただけなので、
        // いきなり交換取り消しにはせず候補を再生成して再提示する（上限到達時のみキャンセル + 返還）。
        if (schedule.proposalRoundCount >= SCHEDULE_PROPOSAL_ROUND_LIMIT) {
          await cancelWithNotice(item, "お届け日の選択期限が過ぎ、候補の再提示回数も上限に達したため自動キャンセルされました");
          continue;
        }

        if (!item.merchantId || !item.merchandiseId) continue;
        const [merchandise, calendar] = await Promise.all([
          getMerchandise(
            { region: config.region, tableName: config.merchandiseTableName },
            item.merchantId,
            item.merchandiseId,
          ),
          getMerchantCalendar(
            { region: config.region, tableName: config.merchantCalendarTableName },
            item.merchantId,
          ),
        ]);
        const product = resolveMerchandiseFulfillment(merchandise?.fulfillment);
        const candidates = generateCandidates(now, product, calendar);

        if (candidates.length === 0) {
          // 自動再生成できない（発送可能日が見つからない）。merchant に手動の再提示を依頼する。
          const sent = await sendOnce(item, "proposalReminderSentAt", async () => {
            const recipients = await resolveMerchantRecipients(item.merchantId);
            if (recipients.length > 0) {
              await sendMerchantProposalReminderEmail({ config: { region: config.region }, recipients, exchange: item });
            }
          });
          if (sent) result.proposalReminders += 1;
          continue;
        }

        const updated = await reproposeCandidates(serviceConfig, {
          item,
          arrivalDates: candidates.map((candidate) => candidate.arrivalDate),
          actor: { actor: "SYSTEM" },
          now,
          product,
          calendar,
          eventType: "CANDIDATES_REGENERATED",
        });
        result.regenerated += 1;

        try {
          const recipient = await resolveEmployeeEmail(updated);
          if (recipient && updated.schedule) {
            await sendEmployeeSelectionRequestEmail({
              config: { region: config.region },
              recipient,
              exchange: updated,
              candidates: updated.schedule.candidates,
              isRegenerated: true,
            });
          }
        } catch (error) {
          console.error("Failed to send regenerated candidates notification.", { error, exchangeId: item.exchangeId });
        }
        continue;
      }

      // 選択期限の 24h 前の催促（最も早い期限が 24h 以内）
      if (schedule.selectionReminderSentAt) continue;
      const nearestDeadline = selectable
        .map((candidate) => candidate.selectableUntil)
        .sort()
        .at(0);
      if (!nearestDeadline || Date.parse(nearestDeadline) - now.getTime() > 24 * HOUR_MS) continue;

      const sent = await sendOnce(item, "selectionReminderSentAt", async () => {
        const recipient = await resolveEmployeeEmail(item);
        if (recipient) {
          await sendEmployeeSelectionReminderEmail({
            config: { region: config.region },
            recipient,
            exchange: item,
            nearestDeadline,
          });
        }
      });
      if (sent) result.selectionReminders += 1;
    } catch (error) {
      result.errors += 1;
      console.error("delivery-schedule batch: selection step failed.", { error, exchangeId: item.exchangeId });
    }
  }

  // 3. AWAITING_MERCHANT_RESPONSE: 48h 超過で督促、さらに 48h でキャンセル + 返還
  for (const item of await listExchangeHistoryByScheduleStatus(exchangeConfig, "AWAITING_MERCHANT_RESPONSE")) {
    try {
      const schedule = item.schedule;
      if (!schedule) continue;

      if (!schedule.responseReminderSentAt) {
        // 希望日の申請時刻は updatedAt で近似する（希望申請時に更新され、督促マーカーでは更新されない）
        const requestedAt = Date.parse(item.updatedAt ?? item.exchangedAt);
        if (!Number.isFinite(requestedAt) || now.getTime() - requestedAt < 48 * HOUR_MS) continue;

        const sent = await sendOnce(item, "responseReminderSentAt", async () => {
          const recipients = await resolveMerchantRecipients(item.merchantId);
          if (recipients.length > 0) {
            await sendMerchantResponseReminderEmail({ config: { region: config.region }, recipients, exchange: item });
          }
        });
        if (sent) result.responseReminders += 1;
        continue;
      }

      const remindedAt = Date.parse(schedule.responseReminderSentAt);
      if (Number.isFinite(remindedAt) && now.getTime() - remindedAt >= 48 * HOUR_MS) {
        await cancelWithNotice(item, "お届け希望日への応答がなかったため自動キャンセルされました");
      }
    } catch (error) {
      result.errors += 1;
      console.error("delivery-schedule batch: merchant response step failed.", { error, exchangeId: item.exchangeId });
    }
  }

  // 4. 確定日前日の受取リマインド（受取失敗を防ぐ要）
  const todayJst = nowYYYYMMDD();
  const tomorrowJst = addCalendarDays(todayJst, 1);
  for (const item of await listConfirmedExchangesByArrivalDate(exchangeConfig, tomorrowJst)) {
    try {
      const schedule = item.schedule;
      if (!schedule || schedule.arrivalReminderSentAt) continue;

      // 確定後にキャンセル・却下された交換にはリマインドを送らない
      // （終端遷移時に gsi4 は外れるが、旧データや取りこぼしに備えて status でも確認する）。
      if (item.status === "CANCELED" || item.status === "CANCELLED" || item.status === "REJECTED") {
        await removeScheduleGsiKeys(serviceConfig, item);
        result.cleanedUp += 1;
        continue;
      }

      const sent = await sendOnce(item, "arrivalReminderSentAt", async () => {
        const recipient = await resolveEmployeeEmail(item);
        if (recipient && schedule.selectedArrivalDate) {
          await sendEmployeeArrivalReminderEmail({
            config: { region: config.region },
            recipient,
            exchange: item,
            arrivalDate: schedule.selectedArrivalDate,
            timeSlot: schedule.selectedTimeSlot,
          });
        }
      });
      if (sent) result.arrivalReminders += 1;
    } catch (error) {
      result.errors += 1;
      console.error("delivery-schedule batch: arrival reminder failed.", { error, exchangeId: item.exchangeId });
    }
  }

  // 5. 到着日を過ぎた CONFIRMED のスパース GSI キーを外す（インデックスの肥大化防止）
  for (const item of await listExchangeHistoryByScheduleStatus(exchangeConfig, "CONFIRMED")) {
    try {
      const arrivalDate = item.schedule?.selectedArrivalDate;
      const isTerminal =
        item.status === "CANCELED" || item.status === "CANCELLED" || item.status === "REJECTED";
      if (!isTerminal && (!arrivalDate || arrivalDate >= todayJst)) continue;
      await removeScheduleGsiKeys(serviceConfig, item);
      result.cleanedUp += 1;
    } catch (error) {
      result.errors += 1;
      console.error("delivery-schedule batch: gsi cleanup failed.", { error, exchangeId: item.exchangeId });
    }
  }

  return result;
}
