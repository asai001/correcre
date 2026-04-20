import "server-only";

import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import type { Mission } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

type MissionItem = Mission & {
  sk: `MISSION#${number}`;
};

export type MissionTableConfig = {
  region: string;
  tableName: string;
};

export function buildMissionSk(slotIndex: number) {
  return `MISSION#${slotIndex}` as const;
}

// 企業の全ミッション（最大 5 件）を slotIndex 順で取得
export async function listMissionsByCompany(config: MissionTableConfig, companyId: string): Promise<Mission[]> {
  const client = getDynamoDocumentClient(config.region);
  const { Items } = await client.send(
    new QueryCommand({
      TableName: config.tableName,
      KeyConditionExpression: "companyId = :companyId",
      ExpressionAttributeValues: {
        ":companyId": companyId,
      },
    }),
  );

  if (!Items?.length) {
    return [];
  }

  return (Items as MissionItem[]).sort((a, b) => a.slotIndex - b.slotIndex);
}

// 特定スロットのミッションを取得
export async function getMissionBySlot(
  config: MissionTableConfig,
  companyId: string,
  slotIndex: number,
): Promise<Mission | null> {
  const client = getDynamoDocumentClient(config.region);
  const { Items } = await client.send(
    new QueryCommand({
      TableName: config.tableName,
      KeyConditionExpression: "companyId = :companyId AND sk = :sk",
      ExpressionAttributeValues: {
        ":companyId": companyId,
        ":sk": buildMissionSk(slotIndex),
      },
    }),
  );

  return (Items?.[0] as Mission | undefined) ?? null;
}

// 有効なミッションのみ取得（enabled = true）
export async function listEnabledMissionsByCompany(config: MissionTableConfig, companyId: string): Promise<Mission[]> {
  const missions = await listMissionsByCompany(config, companyId);
  return missions.filter((m) => m.enabled);
}

// 後方互換エイリアス
export const listEnabledLatestMissionsByCompany = listEnabledMissionsByCompany;
export const listLatestMissionsByCompany = listMissionsByCompany;

// ミッションを保存（新規作成・上書き）
export async function putMission(config: MissionTableConfig, mission: Mission): Promise<void> {
  const client = getDynamoDocumentClient(config.region);
  const item: MissionItem = {
    ...mission,
    sk: buildMissionSk(mission.slotIndex),
  };

  await client.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
    }),
  );
}
