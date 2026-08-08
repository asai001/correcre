import "server-only";

import type { SeminarRegistrationItem } from "@correcre/types";

import { sendSesEmail } from "../email/ses";
import { readRequiredServerEnv } from "../env/server";
import { resolveOperatorNotificationRecipients } from "./operator-recipients";

const DEFAULT_SES_FROM_EMAIL = "correcre-info@efficient-technology.com";

export type SeminarInfo = {
  seminarId: string;
  title: string;
  /** 「2026年9月10日（水）14:00〜15:00」のような自由記述。未設定なら本文から省略する。 */
  scheduleText?: string;
  zoomUrl: string;
  zoomMeetingId?: string;
  zoomPasscode?: string;
};

type Registrant = Pick<
  SeminarRegistrationItem,
  "email" | "name" | "companyName" | "phoneNumber" | "attendeeCount" | "question"
>;

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function buildZoomLines(seminar: SeminarInfo) {
  return [
    "▼参加用 Zoom URL",
    seminar.zoomUrl,
    seminar.zoomMeetingId ? `ミーティングID: ${seminar.zoomMeetingId}` : undefined,
    seminar.zoomPasscode ? `パスコード: ${seminar.zoomPasscode}` : undefined,
  ].filter((line): line is string => Boolean(line));
}

function buildRegistrantEmailBody(params: { seminar: SeminarInfo; registrant: Registrant }) {
  const { seminar, registrant } = params;
  const lines = [
    `${registrant.name} 様`,
    "",
    `このたびは「${seminar.title}」にお申し込みいただきありがとうございます。`,
    "当日は以下の Zoom よりご参加ください。",
    "",
  ];

  if (seminar.scheduleText) {
    lines.push("▼開催日時", seminar.scheduleText, "");
  }

  lines.push(...buildZoomLines(seminar), "");
  lines.push(
    "▼お申し込み内容",
    `会社名（店舗名）: ${registrant.companyName}`,
    `お名前: ${registrant.name}`,
    `メールアドレス: ${registrant.email}`,
  );

  if (registrant.attendeeCount) {
    lines.push(`参加人数: ${registrant.attendeeCount}名`);
  }

  lines.push(
    "",
    "本メールは大切に保管してください。",
    "ご不明な点がありましたら、本メールへの返信にてお問い合わせください。",
    "",
    "------------------------------",
    "コレクレ 運営事務局",
    getSesFromEmail(),
  );

  return lines.join("\n");
}

function buildOperatorEmailBody(params: {
  seminar: SeminarInfo;
  registration: SeminarRegistrationItem;
  emailDelivered: boolean;
}) {
  const { seminar, registration } = params;
  const lines = [
    "コレクレ運用ご担当者様",
    "",
    `「${seminar.title}」に申し込みがありました。`,
    "",
    "申込内容:",
    `会社名（店舗名）: ${registration.companyName}`,
    `お名前: ${registration.name}`,
    `メールアドレス: ${registration.email}`,
    `電話番号: ${registration.phoneNumber ?? "-"}`,
    `参加人数: ${registration.attendeeCount ? `${registration.attendeeCount}名` : "-"}`,
    `初回申込日時: ${formatDateTime(registration.registeredAt)}`,
    `申込回数: ${registration.submitCount}回`,
    "",
    "事前に聞きたいこと:",
    registration.question || "-",
    "",
    params.emailDelivered
      ? "申込者への Zoom 情報メールは送信済みです。"
      : "※申込者への Zoom 情報メールの送信に失敗しました。手動でのご連絡をお願いします。",
    "",
    "本メールはシステムより自動送信されています。",
  ];

  return lines.join("\n");
}

/** 申込者に Zoom 参加情報を送る。説明会申込フォームの主目的なので、失敗は呼び出し側でエラーにする。 */
export async function sendSeminarRegistrationEmail(input: {
  region?: string;
  seminar: SeminarInfo;
  registrant: Registrant;
}): Promise<void> {
  await sendSesEmail(
    {
      region: getRegion(input.region),
      fromEmail: getSesFromEmail(),
    },
    {
      to: input.registrant.email,
      subject: `【コレクレ】${input.seminar.title} お申し込みありがとうございます（Zoom 参加情報）`,
      text: buildRegistrantEmailBody(input),
    },
  );
}

export async function sendOperatorSeminarRegistrationEmail(input: {
  region?: string;
  seminar: SeminarInfo;
  registration: SeminarRegistrationItem;
  emailDelivered: boolean;
}): Promise<void> {
  const region = getRegion(input.region);
  const recipients = await resolveOperatorNotificationRecipients({
    region,
    fallbackEmail: readOptionalServerEnv("OPERATOR_NOTIFICATION_FALLBACK_EMAIL"),
  });

  await sendSesEmail(
    {
      region,
      fromEmail: getSesFromEmail(),
    },
    {
      to: recipients,
      subject: `【コレクレ】説明会お申し込み: ${input.registration.companyName} / ${input.registration.name}`,
      text: buildOperatorEmailBody(input),
    },
  );
}
