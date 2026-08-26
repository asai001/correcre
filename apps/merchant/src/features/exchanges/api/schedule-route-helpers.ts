import "server-only";

import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { isValidYYYYMMDD } from "@correcre/lib/date/business-days";
import { InvalidExchangeStatusTransitionError } from "@correcre/lib/dynamodb/exchange-history";
import {
  CandidateNotSelectableError,
  EmptyCandidatesError,
  ProposalRoundLimitError,
  RescheduleRequestLimitError,
  ScheduleConflictError,
  ScheduleStateError,
} from "@correcre/lib/schedule/service";

const FAILED_MESSAGE = "日程調整の更新に失敗しました。時間をおいて再度お試しください。";

export function parseArrivalDates(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const dates = value.filter((entry): entry is string => typeof entry === "string");
  if (dates.length !== value.length || dates.some((date) => !isValidYYYYMMDD(date))) {
    return null;
  }
  return dates;
}

export function mapScheduleErrorResponse(err: unknown): NextResponse {
  if (err instanceof EmptyCandidatesError) {
    return NextResponse.json({ error: "empty_candidates", message: err.message }, { status: 400 });
  }

  if (err instanceof CandidateNotSelectableError) {
    return NextResponse.json({ error: "candidate_expired", message: err.message }, { status: 409 });
  }

  if (err instanceof ProposalRoundLimitError || err instanceof RescheduleRequestLimitError) {
    return NextResponse.json({ error: "limit_reached", message: err.message }, { status: 409 });
  }

  if (err instanceof ScheduleConflictError) {
    return NextResponse.json({ error: "schedule_conflict", message: err.message }, { status: 409 });
  }

  if (err instanceof ScheduleStateError) {
    return NextResponse.json(
      { error: "invalid_schedule_state", message: "現在の状態ではこの操作はできません。画面を更新してください。" },
      { status: 409 },
    );
  }

  if (err instanceof InvalidExchangeStatusTransitionError) {
    return NextResponse.json({ error: "invalid_transition" }, { status: 400 });
  }

  if (isAwsCredentialError(err)) {
    return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
  }

  if (err instanceof Error) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
