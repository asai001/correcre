import "server-only";

import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import type { ScheduleEventActor, ScheduleEventItem, ScheduleEventType } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

// 配送日程調整の操作ログ。免責条項の根拠となるログのため追記のみ。
// Update / Delete の関数は意図的に実装しない。

export type ScheduleEventTableConfig = {
  region: string;
  tableName: string;
};

export function buildScheduleEventPk(exchangeRequestId: string) {
  return `EXCHANGE#${exchangeRequestId}` as const;
}

export function buildScheduleEventSk(seq: number) {
  return `SEQ#${String(seq).padStart(4, "0")}` as const;
}

export async function listScheduleEvents(
  config: ScheduleEventTableConfig,
  exchangeRequestId: string,
): Promise<ScheduleEventItem[]> {
  const client = getDynamoDocumentClient(config.region);
  const events: ScheduleEventItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": buildScheduleEventPk(exchangeRequestId),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      events.push(...(Items as ScheduleEventItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return events;
}

export type AppendScheduleEventInput = {
  exchangeRequestId: string;
  occurredAt: string;
  actor: ScheduleEventActor;
  actorId?: string;
  actorName?: string;
  eventType: ScheduleEventType;
  payload: Record<string, unknown>;
};

// seq は既存イベント数 + 1 から採番する。同一交換への操作は逐次的（merchant / employee /
// バッチのいずれか 1 者）なので衝突はまれだが、条件付き Put で二重書き込みは防ぎ、
// 衝突時は採番し直して数回リトライする。
export async function appendScheduleEvent(
  config: ScheduleEventTableConfig,
  input: AppendScheduleEventInput,
): Promise<ScheduleEventItem> {
  const client = getDynamoDocumentClient(config.region);

  let seq = (await listScheduleEvents(config, input.exchangeRequestId)).length + 1;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const item: ScheduleEventItem = {
      pk: buildScheduleEventPk(input.exchangeRequestId),
      sk: buildScheduleEventSk(seq),
      exchangeRequestId: input.exchangeRequestId,
      seq,
      occurredAt: input.occurredAt,
      actor: input.actor,
      actorId: input.actorId,
      actorName: input.actorName,
      eventType: input.eventType,
      payload: input.payload,
    };

    try {
      await client.send(
        new PutCommand({
          TableName: config.tableName,
          Item: item,
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        }),
      );
      return item;
    } catch (error) {
      if (isConditionalCheckFailure(error)) {
        seq += 1;
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to append schedule event for exchange ${input.exchangeRequestId}.`);
}

function isConditionalCheckFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ConditionalCheckFailedException"
  );
}
