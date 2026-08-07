import "server-only";

import {
  buildSeminarRegistrationPk,
  buildSeminarRegistrationSk,
  resolveSeminarRegistrationTableName,
  updateSeminarRegistrationNotificationResult,
  upsertSeminarRegistration,
} from "@correcre/lib/dynamodb/seminar-registration";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  sendOperatorSeminarRegistrationEmail,
  sendSeminarRegistrationEmail,
  type SeminarInfo,
} from "@correcre/lib/notification/seminar-events";
import type { SeminarRegistrationItem } from "@correcre/types";

import type { SeminarPageInfo, SubmitSeminarRegistrationInput, SubmitSeminarRegistrationResult } from "../model/types";

const DEFAULT_SEMINAR_ID = "merchant-briefing";
const DEFAULT_SEMINAR_TITLE = "コレクレ 提携企業向け説明会";

const MAX_NAME_LENGTH = 50;
const MAX_COMPANY_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_NUMBER_LENGTH = 30;
const MAX_QUESTION_LENGTH = 1000;
const MAX_ATTENDEE_COUNT = 99;

export class SeminarRegistrationValidationError extends Error {}
export class SeminarNotConfiguredError extends Error {}

function readOptionalServerEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** 制御文字を空白に落とす。メール本文の体裁崩れと不可視文字の混入を防ぐため。 */
function stripControlChars(value: string, keepNewline: boolean) {
  let result = "";

  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;

    if (code >= 0x20 && code !== 0x7f) {
      result += char;
      continue;
    }

    result += keepNewline && char === "\n" ? "\n" : " ";
  }

  return result;
}

function normalizeSingleLine(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return stripControlChars(value, false).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeMultiLine(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return stripControlChars(value.replace(/\r\n?/g, "\n"), true).trim().slice(0, maxLength);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeAttendeeCount(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_ATTENDEE_COUNT) {
    return undefined;
  }

  return parsed;
}

/** Zoom URL が未設定なら null。フォームを開けないようにして、リンクなしメールの送信を防ぐ。 */
function readSeminarConfig(): SeminarInfo | null {
  const zoomUrl = readOptionalServerEnv("SEMINAR_ZOOM_URL");

  if (!zoomUrl) {
    return null;
  }

  return {
    seminarId: readOptionalServerEnv("SEMINAR_EVENT_ID") ?? DEFAULT_SEMINAR_ID,
    title: readOptionalServerEnv("SEMINAR_TITLE") ?? DEFAULT_SEMINAR_TITLE,
    scheduleText: readOptionalServerEnv("SEMINAR_SCHEDULE_TEXT"),
    zoomUrl,
    zoomMeetingId: readOptionalServerEnv("SEMINAR_ZOOM_MEETING_ID"),
    zoomPasscode: readOptionalServerEnv("SEMINAR_ZOOM_PASSCODE"),
  };
}

export function getSeminarPageInfo(): SeminarPageInfo {
  const seminar = readSeminarConfig();

  return {
    configured: Boolean(seminar),
    title: seminar?.title ?? DEFAULT_SEMINAR_TITLE,
    scheduleText: seminar?.scheduleText,
  };
}

async function persistRegistration(params: {
  region: string;
  tableName: string | undefined;
  seminar: SeminarInfo;
  input: {
    email: string;
    name: string;
    companyName: string;
    phoneNumber?: string;
    attendeeCount?: number;
    question?: string;
    userAgent?: string;
  };
  now: string;
}): Promise<SeminarRegistrationItem | null> {
  if (!params.tableName) {
    console.error("Seminar registration table name is not resolvable. Skipped persistence.");
    return null;
  }

  try {
    return await upsertSeminarRegistration(
      { region: params.region, tableName: params.tableName },
      {
        seminarId: params.seminar.seminarId,
        now: params.now,
        ...params.input,
      },
    );
  } catch (error) {
    // 保存できなくても Zoom 情報メールと運用者通知は届けたいので、ここでは失敗を握りつぶす。
    console.error("Failed to persist seminar registration.", {
      seminarId: params.seminar.seminarId,
      email: params.input.email,
      error,
    });
    return null;
  }
}

export async function submitSeminarRegistration(
  input: SubmitSeminarRegistrationInput,
  meta: { userAgent?: string } = {},
): Promise<SubmitSeminarRegistrationResult> {
  const seminar = readSeminarConfig();

  if (!seminar) {
    throw new SeminarNotConfiguredError("説明会の受付は現在準備中です。");
  }

  const name = normalizeSingleLine(input.name, MAX_NAME_LENGTH);
  const companyName = normalizeSingleLine(input.companyName, MAX_COMPANY_NAME_LENGTH);
  const email = normalizeSingleLine(input.email, MAX_EMAIL_LENGTH).toLowerCase();
  const phoneNumber = normalizeSingleLine(input.phoneNumber, MAX_PHONE_NUMBER_LENGTH) || undefined;
  const question = normalizeMultiLine(input.question, MAX_QUESTION_LENGTH) || undefined;
  const attendeeCount = normalizeAttendeeCount(input.attendeeCount);

  if (!name || !companyName || !email) {
    throw new SeminarRegistrationValidationError("お名前・会社名（店舗名）・メールアドレスを入力してください。");
  }

  if (!isValidEmail(email)) {
    throw new SeminarRegistrationValidationError("メールアドレスの形式が正しくありません。");
  }

  const region = readRequiredServerEnv("AWS_REGION");
  const tableName = resolveSeminarRegistrationTableName();
  const now = new Date().toISOString();
  const registrant = { email, name, companyName, phoneNumber, attendeeCount, question };
  const stored = await persistRegistration({
    region,
    tableName,
    seminar,
    input: { ...registrant, userAgent: normalizeSingleLine(meta.userAgent, 300) || undefined },
    now,
  });
  const registration: SeminarRegistrationItem = stored ?? {
    pk: buildSeminarRegistrationPk(seminar.seminarId),
    sk: buildSeminarRegistrationSk(email),
    seminarId: seminar.seminarId,
    ...registrant,
    registeredAt: now,
    updatedAt: now,
    submitCount: 1,
  };

  let emailDelivered = false;
  let emailError: string | undefined;

  try {
    await sendSeminarRegistrationEmail({ region, seminar, registrant });
    emailDelivered = true;
  } catch (error) {
    emailError = error instanceof Error ? error.message : "unknown_error";
    console.error("Failed to send seminar Zoom information email.", {
      seminarId: seminar.seminarId,
      email,
      error,
    });
  }

  await Promise.allSettled([
    sendOperatorSeminarRegistrationEmail({ region, seminar, registration, emailDelivered }).catch((error) => {
      console.error("Failed to notify operators about a seminar registration.", {
        seminarId: seminar.seminarId,
        email,
        error,
      });
    }),
    stored && tableName
      ? updateSeminarRegistrationNotificationResult(
          { region, tableName },
          {
            seminarId: seminar.seminarId,
            email,
            notifiedAt: emailDelivered ? new Date().toISOString() : undefined,
            errorMessage: emailError,
          },
        ).catch((error) => {
          console.error("Failed to store the seminar notification result.", { email, error });
        })
      : Promise.resolve(),
  ]);

  return {
    title: seminar.title,
    scheduleText: seminar.scheduleText,
    zoom: {
      url: seminar.zoomUrl,
      meetingId: seminar.zoomMeetingId,
      passcode: seminar.zoomPasscode,
    },
    emailDelivered,
  };
}
