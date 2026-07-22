import "server-only";

import { PutCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

import type { Mission, MissionHistory } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";
import { buildMissionHistoryPk, buildMissionHistorySk } from "./mission-history";
import { reflectMission, startOfYearMonthIso } from "../mission-schedule";

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

export type MissionScheduleTableConfig = {
  region: string;
  missionTableName: string;
  missionHistoryTableName: string;
};

/**
 * 「翌月月初から反映」予約(pendingChange)が反映予定月に達していれば、それを現行へ昇格して永続化する。
 *
 * - 条件付き TransactWrite（現行 version 一致 かつ pendingChange 存在）で冪等・競合安全に確定する。
 * - 現行 History に validTo を打ち、新版 History を追加する（recent-reports 等の版解決と整合させる）。
 * - 反映不要（予約無し/未到来）なら現行ミッションをそのまま返す。
 * - 競合等で条件失敗した場合は再読込した現行ミッションを返す（他者が昇格済み/即時反映で打ち消し済み）。
 *
 * 反映のタイミング一致には reflectMission()（純粋関数）を用いる。
 */
export async function promoteScheduledMissionIfDue(
  config: MissionScheduleTableConfig,
  companyId: string,
  slotIndex: number,
): Promise<Mission | null> {
  const missionTableConfig: MissionTableConfig = { region: config.region, tableName: config.missionTableName };
  const current = await getMissionBySlot(missionTableConfig, companyId, slotIndex);

  if (!current) {
    return null;
  }

  const reflected = reflectMission(current);
  if (!reflected.changed || !current.pendingChange) {
    return current;
  }

  const promoted = reflected.mission;
  const effectiveFrom = startOfYearMonthIso(current.pendingChange.effectiveYearMonth);
  const client = getDynamoDocumentClient(config.region);

  const newHistory: MissionHistory & { pk: string; sk: string } = {
    pk: buildMissionHistoryPk(companyId, promoted.missionId),
    sk: buildMissionHistorySk(promoted.version),
    companyId,
    missionId: promoted.missionId,
    slotIndex: promoted.slotIndex,
    version: promoted.version,
    title: promoted.title,
    description: promoted.description,
    category: promoted.category,
    monthlyCount: promoted.monthlyCount,
    score: promoted.score,
    fields: promoted.fields,
    validFrom: effectiveFrom,
    validTo: null,
    changedByUserId: current.pendingChange.scheduledByUserId,
    createdAt: effectiveFrom,
  };

  try {
    await client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            // 現行版の History を close（反映時刻 = 月初）。
            Update: {
              TableName: config.missionHistoryTableName,
              Key: {
                pk: buildMissionHistoryPk(companyId, current.missionId),
                sk: buildMissionHistorySk(current.version),
              },
              UpdateExpression: "SET validTo = :validTo",
              ExpressionAttributeValues: { ":validTo": effectiveFrom },
            },
          },
          {
            // 現行ミッションを昇格版で置き換え（pendingChange は含めない＝除去）。
            // 楽観ロック: 版が変わっておらず、まだ予約が残っている場合のみ確定する。
            Put: {
              TableName: config.missionTableName,
              Item: { ...promoted, sk: buildMissionSk(promoted.slotIndex) },
              ConditionExpression: "version = :curVer AND attribute_exists(pendingChange)",
              ExpressionAttributeValues: { ":curVer": current.version },
            },
          },
          {
            // 新版 History を追加（二重反映防止に存在チェック）。
            Put: {
              TableName: config.missionHistoryTableName,
              Item: newHistory,
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
        ],
      }),
    );

    return promoted;
  } catch (error) {
    // 競合（他リクエストが昇格済み/即時反映で打ち消し済み）の可能性 → 現行を読み直して返す。
    const name = error instanceof Error ? error.name : "";
    if (name === "TransactionCanceledException" || name === "ConditionalCheckFailedException") {
      return (await getMissionBySlot(missionTableConfig, companyId, slotIndex)) ?? promoted;
    }
    throw error;
  }
}

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
