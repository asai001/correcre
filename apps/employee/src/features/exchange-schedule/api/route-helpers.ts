import "server-only";

import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { InvalidExchangeStatusTransitionError } from "@correcre/lib/dynamodb/exchange-history";
import {
  CandidateNotSelectableError,
  RescheduleRequestLimitError,
  ScheduleConflictError,
  ScheduleStateError,
} from "@correcre/lib/schedule/service";

import {
  AcknowledgementRequiredError,
  ExchangeScheduleNotFoundError,
  InvalidRequestedDateError,
} from "./server";

export function mapEmployeeScheduleErrorResponse(err: unknown): NextResponse {
  if (err instanceof ExchangeScheduleNotFoundError) {
    return NextResponse.json({ error: "not_found", message: err.message }, { status: 404 });
  }

  if (err instanceof AcknowledgementRequiredError) {
    return NextResponse.json({ error: "acknowledgement_required", message: err.message }, { status: 400 });
  }

  if (err instanceof InvalidRequestedDateError) {
    return NextResponse.json({ error: "invalid_requested_date", message: err.message }, { status: 400 });
  }

  if (err instanceof CandidateNotSelectableError) {
    return NextResponse.json({ error: "candidate_expired", message: err.message }, { status: 409 });
  }

  if (err instanceof RescheduleRequestLimitError) {
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
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
