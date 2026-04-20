import "server-only";

import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { MissionHistory } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

type MissionHistoryItem = MissionHistory & {
  pk: `COMPANY#${string}#MISSION#${string}`;
  sk: `VER#${number}`;
};

export type MissionHistoryTableConfig = {
  region: string;
  tableName: string;
};

export function buildMissionHistoryPk(companyId: string, missionId: string) {
  return `COMPANY#${companyId}#MISSION#${missionId}` as const;
}

export function buildMissionHistorySk(version: number) {
  return `VER#${version}` as const;
}

// 指定ミッションの全履歴を version 順で取得
export async function listMissionHistory(
  config: MissionHistoryTableConfig,
  companyId: string,
  missionId: string,
): Promise<MissionHistory[]> {
  const client = getDynamoDocumentClient(config.region);
  const items: MissionHistoryItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": buildMissionHistoryPk(companyId, missionId),
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      items.push(...(Items as MissionHistoryItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items.sort((a, b) => b.version - a.version);
}

// MissionHistory を保存（新規作成）
export async function putMissionHistory(config: MissionHistoryTableConfig, history: MissionHistory): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  const item: MissionHistoryItem = {
    ...history,
    pk: buildMissionHistoryPk(history.companyId, history.missionId),
    sk: buildMissionHistorySk(history.version),
  };

  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
    }),
  );
}

// 現行版の MissionHistory に validTo を設定（前版クローズ）
export async function closeMissionHistoryVersion(
  config: MissionHistoryTableConfig,
  companyId: string,
  missionId: string,
  version: number,
  validTo: string,
): Promise<void> {
  const client = getDynamoDocumentClient(config.region);

  await client.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        pk: buildMissionHistoryPk(companyId, missionId),
        sk: buildMissionHistorySk(version),
      },
      UpdateExpression: "SET validTo = :validTo",
      ExpressionAttributeValues: {
        ":validTo": validTo,
      },
    }),
  );
}
