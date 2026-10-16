import "server-only";

import type { ExchangeHistoryItem, MerchandiseReservation } from "@correcre/types";

import { getMerchandise } from "../dynamodb/merchandise";
import { getUserByCompanyAndUserId } from "../dynamodb/user";
import { sendSesEmail } from "../email/ses";
import { readRequiredServerEnv } from "../env/server";
import {
  getReservationCodeGuidance,
  getReservationPageGuidance,
  resolveReservationSystem,
} from "../reservation/guidance";

// 交換ステータス遷移に関する通知メール。すべてプレーンテキスト・fire-and-forget で送る
// （送信失敗が業務トランザクションを巻き戻さないよう、呼び出し側で catch してログに残す）。

const DEFAULT_SES_FROM_EMAIL = "correcre-info@efficient-technology.com";

function readOptionalServerEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getSesFromEmail() {
  return readOptionalServerEnv("SES_FROM_EMAIL") ?? DEFAULT_SES_FROM_EMAIL;
}

function getRegion(region?: string) {
  return region ?? readRequiredServerEnv("AWS_REGION");
}

function getEmployeeExchangeUrl(exchangeId: string) {
  const baseUrl =
    readOptionalServerEnv("EMPLOYEE_APP_URL") ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined);
  return baseUrl
    ? `${baseUrl.trim().replace(/\/+$/, "")}/exchange-history/${encodeURIComponent(exchangeId)}`
    : undefined;
}

export type ExchangeNotificationConfig = {
  region?: string;
};

/**
 * 予約が必要な商品の交換が承認されたことを employee に知らせ、予約先を案内する。
 * 外部予約システム（ホットペッパービューティー等）とは自動連携できないため、
 * 予約時に交換番号を店舗へ伝えてもらい、店舗側で申請と照合する運用を前提とする。
 */
export async function sendEmployeeExchangeApprovedReservationEmail(params: {
  config: ExchangeNotificationConfig;
  recipient: string;
  exchange: ExchangeHistoryItem;
  reservation: MerchandiseReservation;
}) {
  const lines = [
    `「${params.exchange.merchandiseNameSnapshot}」の交換申請が承認されました。`,
    "このサービスのご利用には、ご自身での予約が必要です。以下の案内に沿ってご予約ください。",
    "",
    // 連番導入前の既存レコードには reservationCode が無いため exchangeId で案内する
    `交換番号：${params.exchange.reservationCode ?? params.exchange.exchangeId}`,
  ];

  const reservationSystem = resolveReservationSystem(params.reservation);

  if (params.reservation.reservationUrl) {
    lines.push("", "予約ページ:", params.reservation.reservationUrl);
    const pageGuidance = getReservationPageGuidance(reservationSystem);
    if (pageGuidance) {
      lines.push(pageGuidance);
    }
  }

  if (params.reservation.instructions) {
    lines.push("", "予約方法・注意事項:", params.reservation.instructions);
  }

  lines.push(
    "",
    getReservationCodeGuidance(reservationSystem),
    "（店舗が交換申請とご予約を照合するために使用します）",
  );

  const url = getEmployeeExchangeUrl(params.exchange.exchangeId);
  if (url) {
    lines.push("", "交換内容・予約案内の確認はこちら:", url);
  }

  await sendSesEmail(
    {
      region: getRegion(params.config.region),
      fromEmail: getSesFromEmail(),
    },
    {
      to: params.recipient,
      subject: "【コレクレ】交換申請が承認されました。ご予約をお願いします",
      text: `${lines.join("\n")}\n\n本メールはシステムより自動送信されています。`,
    },
  );
}

/**
 * 承認（REQUESTED → PREPARING）時に、商品が予約案内を持つ場合だけ employee へメールする。
 * merchant / operator 両方の承認経路から呼ばれる共通処理。失敗しても throw しない。
 */
export async function notifyEmployeeExchangeApprovedIfReservationRequired(params: {
  region: string;
  userTableName: string;
  merchandiseTableName: string;
  exchange: ExchangeHistoryItem;
}): Promise<void> {
  try {
    if (!params.exchange.merchantId || !params.exchange.merchandiseId) {
      return;
    }

    const merchandise = await getMerchandise(
      {
        region: params.region,
        tableName: params.merchandiseTableName,
      },
      params.exchange.merchantId,
      params.exchange.merchandiseId,
    );

    const reservation = merchandise?.reservation;
    if (!reservation || (!reservation.reservationUrl && !reservation.instructions)) {
      return;
    }

    const user = await getUserByCompanyAndUserId(
      {
        region: params.region,
        tableName: params.userTableName,
      },
      params.exchange.companyId,
      params.exchange.userId,
    );

    const recipient = user?.email?.trim();
    if (!recipient) {
      return;
    }

    await sendEmployeeExchangeApprovedReservationEmail({
      config: { region: params.region },
      recipient,
      exchange: params.exchange,
      reservation,
    });
  } catch (error) {
    console.error("Failed to send exchange approved reservation notification.", {
      error,
      exchangeId: params.exchange.exchangeId,
    });
  }
}

/**
 * 運用者が提携企業を削除し、対応中だった交換をキャンセルしたことを申請者へ知らせる。
 * ポイントはキャンセル時に返還済み。削除の事情は書かず、お詫びと返還の事実だけを伝える。
 * 送信失敗は throw せずログに残す（呼び出し側は送れなかった宛先を画面で案内する）。
 */
export async function notifyEmployeeExchangeCanceledByMerchantDeletion(params: {
  region: string;
  recipient: string;
  exchange: ExchangeHistoryItem;
}): Promise<boolean> {
  const lines = [
    `お申し込みいただいていた「${params.exchange.merchandiseNameSnapshot}」の交換は、`,
    "提供元の事情により、お取り扱いができなくなりました。",
    "誠に恐れ入りますが、本交換はキャンセルとさせていただきました。",
    "",
    `ご利用いただいた ${params.exchange.usedPoint.toLocaleString("ja-JP")} pt は返還済みです。`,
    "お手数をおかけし申し訳ございませんが、ほかの商品・サービスとの交換にご利用ください。",
  ];

  const url = getEmployeeExchangeUrl(params.exchange.exchangeId);
  if (url) {
    lines.push("", "交換内容の確認はこちら:", url);
  }

  try {
    await sendSesEmail(
      {
        region: getRegion(params.region),
        fromEmail: getSesFromEmail(),
      },
      {
        to: params.recipient,
        subject: "【コレクレ】交換申請のキャンセルとポイント返還のお知らせ",
        text: `${lines.join("\n")}\n\n本メールはシステムより自動送信されています。`,
      },
    );
    return true;
  } catch (error) {
    console.error("Failed to send merchant deletion cancellation notification.", {
      error,
      exchangeId: params.exchange.exchangeId,
    });
    return false;
  }
}
