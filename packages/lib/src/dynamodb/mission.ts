import "server-only";

import { QueryCommand } from "@aws-sdk/lib-dynamodb";

import type { Mission } from "@correcre/types";

import { getDynamoDocumentClient } from "./client";

type MissionItem = Mission & {
  sk: `MISSION#${string}#VER#${number}`;
  gsi1pk?: `COMPANY#${string}`;
  gsi1sk?: `ENABLED#${0 | 1}#ORDER#${string}#MISSION#${string}#VER#${number}`;
};

export type MissionTableConfig = {
  region: string;
  tableName: string;
};

export function buildMissionSk(missionId: string, version: number) {
  return `MISSION#${missionId}#VER#${version}` as const;
}

export async function listLatestMissionsByCompany(config: MissionTableConfig, companyId: string): Promise<Mission[]> {
  const client = getDynamoDocumentClient(config.region);
  const missions: MissionItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await client.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "companyId = :companyId",
        ExpressionAttributeValues: {
          ":companyId": companyId,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (Items?.length) {
      missions.push(...(Items as MissionItem[]));
    }

    exclusiveStartKey = LastEvaluatedKey;
  } while (exclusiveStartKey);

  const latestMissionById = new Map<string, MissionItem>();

  for (const mission of missions) {
    const current = latestMissionById.get(mission.missionId);

    if (!current || mission.version > current.version) {
      latestMissionById.set(mission.missionId, mission);
    }
  }

  return [...latestMissionById.values()].sort(
    (left, right) => left.order - right.order || left.title.localeCompare(right.title, "ja"),
  );
}

export async function listEnabledLatestMissionsByCompany(
  config: MissionTableConfig,
  companyId: string,
): Promise<Mission[]> {
  const missions = await listLatestMissionsByCompany(config, companyId);
  return missions.filter((mission) => mission.enabled);
}
