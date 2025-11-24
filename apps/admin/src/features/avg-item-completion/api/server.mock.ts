import data from "../../../../../mock/dynamodb.json";
import { toYYYYMM } from "@correcre/lib";
import { Mission, Company, MissionReport } from "@correcre/types";
import type { AvgItemCompletionItem, MissionTargetCountByMissionId, MissionReportCountByMissionId } from "../model/types";

/** YYYY-MM を monthOffset だけずらす（-1 → 前月など） */
function shiftYearMonth(baseYm: string, monthOffset: number): string {
  const [yStr, mStr] = baseYm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 1 + monthOffset, 1);
  return toYYYYMM(d); // YYYY-MM 形式で返す
}

async function getMission(companyId: string): Promise<Mission[] | null> {
  const Items = data.Mission;

  if (!Items) {
    return null;
  }

  return Items.filter((i) => i.companyId === companyId && i.enabled) as Mission[];
}

async function getCompany(companyId: string): Promise<Company | null | undefined> {
  const Items = data.Company;

  if (!Items) {
    return null;
  }

  return Items.find((i) => (i.companyId = companyId)) as Company | undefined;
}

async function getMissionReports(companyId: string, missionIds: string[], yearMonth: string): Promise<MissionReport[] | null> {
  const Items = data.MissionReports;

  if (!Items) {
    return null;
  }

  return Items.filter(
    (i) =>
      i.companyId === companyId &&
      missionIds.includes(i.missionId) &&
      toYYYYMM(new Date(i.reportedAt)) === yearMonth &&
      i.status === "APPROVED"
  ) as MissionReport[];
}

/**
 * 企業の「先月の項目ごとの平均達成割合」を返す
 * endYm が指定されない場合は「現在日付の属する月」を終端として扱う
 */
export async function getAvgItemCompletionFromDynamoMock(
  companyId: string,
  thisYearMonth: string
): Promise<AvgItemCompletionItem[] | null> {
  // Mission から現在有効な missionId を取得
  const [missions, company] = await Promise.all([getMission(companyId), getCompany(companyId)]);

  if (!missions || missions.length === 0) {
    throw new Error(`No missions found for companyId=${companyId}`);
  }
  if (!company) {
    throw new Error(`Company not found for companyId=${companyId}`);
  }

  const missionIds = missions.map((m) => m.missionId);

  // Company から管理対象従業員数を取得
  const activeEmployees = company.activeEmployees;

  const targetYm = shiftYearMonth(thisYearMonth, -1);

  // 上記で monthlyCount * 従業員数 を計算（達成割合の分母）して 計算用オブジェクト を生成
  const denominatorMap: MissionTargetCountByMissionId = {};
  for (const m of missions) {
    denominatorMap[m.missionId] = m.monthlyCount * activeEmployees;
  }

  // MissionReports から、companyId に一致、有効な missionId に一致、reportedAt が先月に一致 のレコードを取得
  const missionReports = await getMissionReports(companyId, missionIds, targetYm);
  if (!missionReports) {
    throw new Error(`missionReports not found for companyId=${companyId}`);
  }
  const counterMap: MissionReportCountByMissionId = {};
  for (const r of missionReports) {
    if (!counterMap[r.missionId]) {
      counterMap[r.missionId] = 1;
      continue;
    }
    counterMap[r.missionId]++;
  }

  const res = missions.map((m) => {
    const denom = denominatorMap[m.missionId] ?? 0;
    const num = counterMap[m.missionId] ?? 0;
    const rate = denom === 0 ? 0 : Math.min(100, Math.round((num / denom) * 100));

    return {
      title: m.title,
      completionRate: Math.round(rate),
    };
  });

  return res;
}
