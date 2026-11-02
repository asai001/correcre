import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { isValidSlotIndex } from "@correcre/mission-management/server";

// 管理者のミッション API（/api/missions 配下）で共通に使う応答の組み立て。

const MISSION_REQUEST_FAILED_MESSAGE = "ミッションの処理に失敗しました。時間をおいて再度お試しください。";
const MISSION_CONFLICT_MESSAGE =
  "ミッションが他の操作で更新されました。画面を再読み込みしてから、もう一度お試しください。";

// AWS SDK の例外（DynamoDB の条件不一致など）。メッセージにテーブル名などの内部情報が入るため画面には出さない。
function getAwsServiceErrorName(err: unknown): string | null {
  if (typeof err === "object" && err !== null && "$metadata" in err && err instanceof Error) {
    return err.name;
  }

  return null;
}

// URL の [slotIndex] を 1〜5 の整数に変換する。不正なら null。
export function parseSlotIndex(value: string): number | null {
  const slotIndex = Number(value);
  return isValidSlotIndex(slotIndex) ? slotIndex : null;
}

export function invalidSlotIndexResponse() {
  return NextResponse.json({ error: "invalid slotIndex" }, { status: 400 });
}

// 入力検証・合計点の上限などの業務エラーは 400 でメッセージを返し、
// AWS 由来のエラーは内部情報を出さずに汎用メッセージにする。
export function missionErrorResponse(err: unknown, context: string) {
  console.error(`${context} error`, err);

  if (isAwsCredentialError(err)) {
    return NextResponse.json({ error: MISSION_REQUEST_FAILED_MESSAGE }, { status: 500 });
  }

  const awsErrorName = getAwsServiceErrorName(err);

  if (awsErrorName === "ConditionalCheckFailedException" || awsErrorName === "TransactionCanceledException") {
    return NextResponse.json({ error: MISSION_CONFLICT_MESSAGE }, { status: 409 });
  }

  if (awsErrorName) {
    return NextResponse.json({ error: MISSION_REQUEST_FAILED_MESSAGE }, { status: 500 });
  }

  if (err instanceof Error) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
