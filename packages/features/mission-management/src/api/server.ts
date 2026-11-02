import { randomUUID } from "node:crypto";
import { TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { nextMonthYYYYMM, nowYYYYMM, reflectMission } from "@correcre/lib";
import { getDynamoDocumentClient } from "@correcre/lib/dynamodb/client";
import {
  buildMissionSk,
  listMissionsByCompany,
  getMissionBySlot,
  promoteScheduledMissionIfDue,
} from "@correcre/lib/dynamodb/mission";
import {
  buildMissionHistoryPk,
  buildMissionHistorySk,
  listMissionHistory,
} from "@correcre/lib/dynamodb/mission-history";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { Mission, MissionHistory, ScheduledMissionChange } from "@correcre/types";

import {
  MISSION_SLOT_COUNT,
  MISSION_TOTAL_POINTS_CAP,
  createEmptyMissionSummary,
  toMissionSummary,
  toHistoryItem,
  type MissionApplyMode,
  type MissionSlotSummary,
  type MissionHistoryItem,
  type UpdateMissionInput,
} from "../model/types";
import { validateMissionInput } from "../model/validation";

type RuntimeConfig = {
  region: string;
  missionTableName: string;
  missionHistoryTableName: string;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    missionTableName: readRequiredServerEnv("DDB_MISSION_TABLE_NAME"),
    missionHistoryTableName: readRequiredServerEnv("DDB_MISSION_HISTORY_TABLE_NAME"),
  };
}

export function isValidSlotIndex(slotIndex: number): boolean {
  return Number.isInteger(slotIndex) && slotIndex >= 1 && slotIndex <= MISSION_SLOT_COUNT;
}

// 画面側（MissionEditDialog）と同じ検証をサーバーでも行う。API を直接呼ばれても不正な値を保存しないため。
function validateUpdateInput(input: UpdateMissionInput): void {
  const validationError = validateMissionInput(input);

  if (validationError) {
    throw new Error(validationError);
  }
}

// 企業の全ミッション（5 件）を取得
export async function listMissionsForCompany(companyId: string): Promise<MissionSlotSummary[]> {
  const config = getRuntimeConfig();
  const missions = await listMissionsByCompany(
    { region: config.region, tableName: config.missionTableName },
    companyId,
  );

  // 反映予定月に達した予約(pendingChange)があれば、この読み取り機会に昇格して永続化する。
  const reconciledMissions = await Promise.all(
    missions.map(async (mission) => {
      if (!reflectMission(mission).changed) {
        return mission;
      }
      const promoted = await promoteScheduledMissionIfDue(
        {
          region: config.region,
          missionTableName: config.missionTableName,
          missionHistoryTableName: config.missionHistoryTableName,
        },
        companyId,
        mission.slotIndex,
      );
      return promoted ?? mission;
    }),
  );

  const missionMap = new Map(reconciledMissions.map((mission) => [mission.slotIndex, mission]));

  return Array.from({ length: MISSION_SLOT_COUNT }, (_, index) => {
    const slotIndex = index + 1;
    const mission = missionMap.get(slotIndex);

    return mission ? toMissionSummary(mission) : createEmptyMissionSummary(slotIndex);
  });
}

// ミッションの新規作成・編集（Mission + MissionHistory を更新）
// applyMode="immediate": 即時に新版へ差し替え（従来挙動）。予約(pendingChange)があれば同時に打ち消す。
// applyMode="scheduled": 翌月月初(00:00 JST)から反映する予約として pendingChange に載せる（版は上げない）。
export async function updateMissionInDynamo(
  companyId: string,
  slotIndex: number,
  input: UpdateMissionInput,
  changedByUserId: string,
  applyMode: MissionApplyMode = "immediate",
): Promise<MissionSlotSummary> {
  if (!isValidSlotIndex(slotIndex)) {
    throw new Error("スロット番号が不正です。");
  }

  validateUpdateInput(input);

  const config = getRuntimeConfig();

  // 有効な全ミッションの「月間実施回数 × 点数」の合計が 100 点を超えないようにする。
  // （無効なミッションは従業員が獲得できないため合計に含めない）
  const allMissions = await listMissionsByCompany(
    { region: config.region, tableName: config.missionTableName },
    companyId,
  );
  const otherMissionsPoints = allMissions
    .filter((mission) => mission.slotIndex !== slotIndex && mission.enabled)
    .reduce((sum, mission) => sum + mission.monthlyCount * mission.score, 0);
  const editedMissionPoints = input.enabled ? input.monthlyCount * input.score : 0;
  const projectedTotalPoints = otherMissionsPoints + editedMissionPoints;

  if (projectedTotalPoints > MISSION_TOTAL_POINTS_CAP) {
    throw new Error(
      `全ミッションの「月間実施回数 × 点数」の合計が ${MISSION_TOTAL_POINTS_CAP} 点を超えています（この設定では合計 ${projectedTotalPoints} 点）。`,
    );
  }

  const currentMission = await getMissionBySlot(
    { region: config.region, tableName: config.missionTableName },
    companyId,
    slotIndex,
  );

  const now = new Date().toISOString();

  // 「翌月月初から反映」予約: 版は上げず、現行アイテムに pendingChange を載せるだけ。
  // 実際の反映（版up＋History）は反映予定月に達した後の読み取り/提出時に昇格させる。
  if (applyMode === "scheduled") {
    if (!currentMission) {
      throw new Error("新規スロットは即時反映のみ可能です。まず作成してから翌月反映を予約してください。");
    }

    const pendingChange: ScheduledMissionChange = {
      effectiveYearMonth: nextMonthYYYYMM(nowYYYYMM()),
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      monthlyCount: input.monthlyCount,
      score: input.score,
      enabled: input.enabled,
      fields: input.fields,
      // null（企業既定に従う）のときは属性ごと持たせない。
      analysisThresholds: input.analysisThresholds ?? undefined,
      scheduledByUserId: changedByUserId,
      scheduledAt: now,
    };

    const client = getDynamoDocumentClient(config.region);
    await client.send(
      new UpdateCommand({
        TableName: config.missionTableName,
        Key: { companyId, sk: buildMissionSk(slotIndex) },
        UpdateExpression: "SET pendingChange = :pc, updatedAt = :now",
        ConditionExpression: "attribute_exists(companyId) AND attribute_exists(sk)",
        ExpressionAttributeValues: { ":pc": pendingChange, ":now": now },
      }),
    );

    return toMissionSummary({ ...currentMission, pendingChange, updatedAt: now });
  }

  const nextVersion = currentMission ? currentMission.version + 1 : 1;
  const missionId = currentMission?.missionId ?? randomUUID();

  const updatedMission: Mission & { sk: string } = {
    companyId,
    sk: buildMissionSk(slotIndex),
    missionId,
    slotIndex,
    version: nextVersion,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    monthlyCount: input.monthlyCount,
    score: input.score,
    enabled: input.enabled,
    fields: input.fields,
    // null（企業既定に従う）のときは属性ごと持たせない。
    // Put による全項目置き換えなので、以前設定されていた値もここで消える。
    analysisThresholds: input.analysisThresholds ?? undefined,
    createdAt: currentMission?.createdAt ?? now,
    updatedAt: now,
  };

  const newHistory: MissionHistory & { pk: string; sk: string } = {
    pk: buildMissionHistoryPk(companyId, missionId),
    sk: buildMissionHistorySk(nextVersion),
    companyId,
    missionId,
    slotIndex,
    version: nextVersion,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    monthlyCount: input.monthlyCount,
    score: input.score,
    fields: input.fields,
    analysisThresholds: input.analysisThresholds ?? undefined,
    validFrom: now,
    validTo: null,
    changedByUserId,
    createdAt: now,
  };

  const client = getDynamoDocumentClient(config.region);

  const transactItems = currentMission
    ? [
        {
          Update: {
            TableName: config.missionHistoryTableName,
            Key: {
              pk: buildMissionHistoryPk(companyId, currentMission.missionId),
              sk: buildMissionHistorySk(currentMission.version),
            },
            UpdateExpression: "SET validTo = :validTo",
            ExpressionAttributeValues: {
              ":validTo": now,
            },
          },
        },
        {
          Put: {
            TableName: config.missionTableName,
            Item: updatedMission,
          },
        },
        {
          Put: {
            TableName: config.missionHistoryTableName,
            Item: newHistory,
          },
        },
      ]
    : [
        {
          Put: {
            TableName: config.missionTableName,
            Item: updatedMission,
            ConditionExpression: "attribute_not_exists(companyId) AND attribute_not_exists(sk)",
          },
        },
        {
          Put: {
            TableName: config.missionHistoryTableName,
            Item: newHistory,
          },
        },
      ];

  await client.send(new TransactWriteCommand({ TransactItems: transactItems }));

  return toMissionSummary(updatedMission);
}

// 「翌月月初から反映」予約を取り消す（pendingChange を除去）。
export async function cancelScheduledMissionChange(
  companyId: string,
  slotIndex: number,
): Promise<MissionSlotSummary> {
  if (!isValidSlotIndex(slotIndex)) {
    throw new Error("スロット番号が不正です。");
  }

  const config = getRuntimeConfig();
  const client = getDynamoDocumentClient(config.region);
  const now = new Date().toISOString();

  const { Attributes } = await client.send(
    new UpdateCommand({
      TableName: config.missionTableName,
      Key: { companyId, sk: buildMissionSk(slotIndex) },
      UpdateExpression: "SET updatedAt = :now REMOVE pendingChange",
      ConditionExpression: "attribute_exists(companyId) AND attribute_exists(sk)",
      ExpressionAttributeValues: { ":now": now },
      ReturnValues: "ALL_NEW",
    }),
  );

  if (!Attributes) {
    throw new Error("対象のミッションが見つかりません。");
  }

  return toMissionSummary(Attributes as Mission);
}

// ミッション編集履歴を取得
export async function listMissionHistoryForSlot(
  companyId: string,
  slotIndex: number,
): Promise<MissionHistoryItem[]> {
  if (!isValidSlotIndex(slotIndex)) {
    throw new Error("スロット番号が不正です。");
  }

  const config = getRuntimeConfig();
  const mission = await getMissionBySlot(
    { region: config.region, tableName: config.missionTableName },
    companyId,
    slotIndex,
  );

  if (!mission) {
    throw new Error("対象のミッションが見つかりません。");
  }

  const history = await listMissionHistory(
    { region: config.region, tableName: config.missionHistoryTableName },
    companyId,
    mission.missionId,
  );

  return history.map(toHistoryItem);
}
