/**
 * 保守環境向けシードスクリプト
 *
 * 分析・レポート画面の確認用に、ミッション達成傾向が対照的な 2 社分のデータを
 * DynamoDB へ投入する。会社 ID / ユーザー ID / 部門 ID は決定論的に採番するため、
 * 再実行すると既存行を上書きする（冪等）。
 *
 * 実行例:
 *   STAGE=stg AWS_PROFILE=CorreCre-Stg-Account npx ts-node scripts/seed-maintenance.ts
 */

import { randomUUID } from "node:crypto";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

type Stage = "dev" | "stg" | "prod";

type TableNames = {
  company: string;
  user: string;
  department: string;
  mission: string;
  missionHistory: string;
  missionReport: string;
  userMonthlyStats: string;
  exchangeHistory: string;
};

type Pattern = "poor" | "good";

type CompanySpec = {
  companyId: string;
  name: string;
  kanaName: string;
  shortName: string;
  pattern: Pattern;
};

type MissionFieldTemplate = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "multiSelect" | "date" | "datetime" | "number";
  required: boolean;
  order: number;
  options?: string[];
  placeholder?: string;
};

type MissionTemplate = {
  slotIndex: number;
  title: string;
  description: string;
  category: string;
  score: number;
  monthlyCount: number;
  baseRate: Record<Pattern, number>;
  fields: MissionFieldTemplate[];
  sampleValues: Record<string, string>[];
};

type UserTemplate = {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  departmentIndex: 0 | 1;
};

type DepartmentTemplate = {
  id: string;
  name: string;
  sortOrder: number;
};

const STAGE = (process.env.STAGE ?? "stg") as Stage;
const REGION = process.env.AWS_REGION ?? "ap-northeast-1";
const PROFILE = process.env.AWS_PROFILE;

const TABLES: TableNames = {
  company: `correcre-company-${STAGE}`,
  user: `correcre-user-${STAGE}`,
  department: `correcre-department-${STAGE}`,
  mission: `correcre-mission-${STAGE}`,
  missionHistory: `correcre-mission-history-${STAGE}`,
  missionReport: `correcre-mission-report-${STAGE}`,
  userMonthlyStats: `correcre-user-monthly-stats-${STAGE}`,
  exchangeHistory: `correcre-exchange-history-${STAGE}`,
};

const MONTHS_INCLUDING_CURRENT = 13;

const COMPANIES: CompanySpec[] = [
  {
    companyId: "seed-poor-company",
    name: "株式会社アカマツ商会",
    kanaName: "カブシキガイシャアカマツショウカイ",
    shortName: "アカマツ商会",
    pattern: "poor",
  },
  {
    companyId: "seed-good-company",
    name: "株式会社シラカワエンジニアリング",
    kanaName: "カブシキガイシャシラカワエンジニアリング",
    shortName: "シラカワ",
    pattern: "good",
  },
];

// score × monthlyCount の合計を 100 に揃える（各 20）。
const MISSIONS: MissionTemplate[] = [
  {
    slotIndex: 1,
    title: "朝会参加",
    description: "毎営業日の朝会に参加し、当日の予定を共有する。",
    category: "コミュニケーション",
    score: 2,
    monthlyCount: 10,
    baseRate: { poor: 85, good: 95 },
    fields: [
      { key: "shareTopic", label: "共有内容", type: "text", required: true, order: 1, placeholder: "当日の予定や共有事項" },
    ],
    sampleValues: [
      { shareTopic: "午前はA社向け提案書の作成、午後は訪問予定" },
      { shareTopic: "新人オンボーディングの進捗共有" },
      { shareTopic: "進行中プロジェクトの課題共有とヘルプ依頼" },
      { shareTopic: "顧客問い合わせへの回答ステータスを報告" },
      { shareTopic: "来週のリリース計画のすり合わせ" },
    ],
  },
  {
    slotIndex: 2,
    title: "5S活動",
    description: "職場の整理・整頓・清掃・清潔・しつけを実施する。",
    category: "業務改善",
    score: 5,
    monthlyCount: 4,
    baseRate: { poor: 80, good: 95 },
    fields: [
      { key: "area", label: "対象エリア", type: "select", required: true, order: 1, options: ["執務スペース", "会議室", "共有棚", "サーバールーム"] },
      { key: "detail", label: "実施内容", type: "textarea", required: true, order: 2 },
    ],
    sampleValues: [
      { area: "執務スペース", detail: "デスク周りの書類を整理し、不要物を廃棄した" },
      { area: "会議室", detail: "ホワイトボード・配線を整え、備品を所定位置に戻した" },
      { area: "共有棚", detail: "ラベルを貼り替え、在庫一覧を更新した" },
      { area: "サーバールーム", detail: "ケーブル結束と清掃を実施" },
    ],
  },
  {
    slotIndex: 3,
    title: "改善提案",
    description: "業務プロセスの改善案を提出する。",
    category: "業務改善",
    score: 10,
    monthlyCount: 2,
    baseRate: { poor: 30, good: 95 },
    fields: [
      { key: "title", label: "提案タイトル", type: "text", required: true, order: 1 },
      { key: "summary", label: "提案内容", type: "textarea", required: true, order: 2 },
    ],
    sampleValues: [
      { title: "日報フォーマットの見直し", summary: "入力必須項目を絞り、運用負荷を3割削減できる見込み" },
      { title: "共有ドライブの階層整理", summary: "部門別フォルダを統一ルールで再編し検索性を向上" },
      { title: "定例会議の時間短縮", summary: "事前アジェンダ配布により30分を20分に短縮する運用へ" },
    ],
  },
  {
    slotIndex: 4,
    title: "部署横断MTG",
    description: "他部署と連携するミーティングに参加する。",
    category: "コミュニケーション",
    score: 4,
    monthlyCount: 5,
    baseRate: { poor: 50, good: 95 },
    fields: [
      { key: "counterpartDept", label: "相手部署", type: "text", required: true, order: 1 },
      { key: "agenda", label: "主な議題", type: "textarea", required: true, order: 2 },
    ],
    sampleValues: [
      { counterpartDept: "開発部", agenda: "新機能リリース時の役割分担と窓口調整" },
      { counterpartDept: "営業部", agenda: "顧客要望のフィードバック共有と優先度調整" },
      { counterpartDept: "管理部", agenda: "経費精算フローの改善方針をすり合わせ" },
    ],
  },
  {
    slotIndex: 5,
    title: "日報提出",
    description: "営業日ごとに日報を提出する。",
    category: "日常業務",
    score: 1,
    monthlyCount: 20,
    baseRate: { poor: 75, good: 95 },
    fields: [
      { key: "doneToday", label: "本日の実施内容", type: "textarea", required: true, order: 1 },
      { key: "nextPlan", label: "翌営業日の予定", type: "textarea", required: false, order: 2 },
    ],
    sampleValues: [
      { doneToday: "顧客A社との定例MTGを実施。次回までに見積案を送付予定", nextPlan: "見積案のドラフトを作成し、上長レビューを依頼" },
      { doneToday: "障害対応のログ調査と再発防止策の整理", nextPlan: "チーム内で再発防止策をレビュー" },
      { doneToday: "新規案件の要件ヒアリング2件", nextPlan: "要件整理メモを展開しチームで確認" },
      { doneToday: "週次レポートを作成し関係者へ共有", nextPlan: "フィードバックを反映し翌週の計画を更新" },
    ],
  },
];

const DEPARTMENTS: DepartmentTemplate[] = [
  { id: "dept-001", name: "営業部", sortOrder: 1 },
  { id: "dept-002", name: "開発部", sortOrder: 2 },
];

const USERS: UserTemplate[] = [
  { lastName: "田中", firstName: "一郎", lastNameKana: "タナカ", firstNameKana: "イチロウ", role: "ADMIN", departmentIndex: 0 },
  { lastName: "佐藤", firstName: "花子", lastNameKana: "サトウ", firstNameKana: "ハナコ", role: "MANAGER", departmentIndex: 0 },
  { lastName: "鈴木", firstName: "健", lastNameKana: "スズキ", firstNameKana: "ケン", role: "EMPLOYEE", departmentIndex: 0 },
  { lastName: "高橋", firstName: "美咲", lastNameKana: "タカハシ", firstNameKana: "ミサキ", role: "EMPLOYEE", departmentIndex: 1 },
  { lastName: "伊藤", firstName: "大輝", lastNameKana: "イトウ", firstNameKana: "ダイキ", role: "EMPLOYEE", departmentIndex: 1 },
  { lastName: "渡辺", firstName: "愛", lastNameKana: "ワタナベ", firstNameKana: "アイ", role: "EMPLOYEE", departmentIndex: 1 },
];

function buildDocumentClient() {
  const client = new DynamoDBClient({
    region: REGION,
    ...(PROFILE ? { credentials: fromIni({ profile: PROFILE }) } : {}),
  });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toYYYYMM(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function daysInMonth(year: number, monthIndexZeroBased: number) {
  return new Date(year, monthIndexZeroBased + 1, 0).getDate();
}

function listTargetYearMonths(now: Date): string[] {
  const items: string[] = [];
  for (let offset = MONTHS_INCLUDING_CURRENT - 1; offset >= 0; offset -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    items.push(toYYYYMM(d));
  }
  return items;
}

// シード投入再実行時に乱数が同じになるよう deterministic PRNG を使う。
function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value);
}

type PreparedCompany = {
  spec: CompanySpec;
  users: Array<UserTemplate & { userId: string; email: string; cognitoSub: string; departmentId: string; departmentName: string }>;
  missions: Array<MissionTemplate & { missionId: string }>;
};

function prepareCompany(spec: CompanySpec): PreparedCompany {
  const users = USERS.map((u, index) => {
    const userId = `u-${String(index + 1).padStart(3, "0")}`;
    const department = DEPARTMENTS[u.departmentIndex];
    return {
      ...u,
      userId,
      email: `${spec.companyId}-${userId}@example.invalid`,
      cognitoSub: `seed-${spec.companyId}-${userId}`,
      departmentId: department.id,
      departmentName: department.name,
    };
  });

  const missions = MISSIONS.map((m) => ({
    ...m,
    missionId: `${spec.companyId}-mission-${m.slotIndex}`,
  }));

  return { spec, users, missions };
}

// 月次係数: 古い月→新しい月。poor は 1.10→0.47 (score ~70→~30)、good は 0.87→1.00 に軽いノイズ。
function monthlyScoreFactor(pattern: Pattern, monthIndex: number, totalMonths: number, rng: () => number): number {
  const t = totalMonths <= 1 ? 0 : monthIndex / (totalMonths - 1);
  if (pattern === "poor") {
    const base = 1.10 - 0.63 * t; // 1.10→0.47
    const noise = (rng() - 0.5) * 0.08; // ±4%
    return clamp(base + noise, 0.2, 1.2);
  }
  const base = 0.87 + 0.13 * rng(); // 0.87〜1.00
  return clamp(base, 0.75, 1.05);
}

// 月×ミッションの目標達成率(%). 会社単位の報告件数算出に使う。
function missionRateForMonth(mission: MissionTemplate, pattern: Pattern, monthIndex: number, totalMonths: number, rng: () => number): number {
  const base = mission.baseRate[pattern];
  if (pattern === "poor") {
    const t = totalMonths <= 1 ? 0 : monthIndex / (totalMonths - 1);
    const drift = 1.05 - 0.25 * t; // 1.05→0.80 の緩やかなドリフト
    const noise = (rng() - 0.5) * 0.10; // ±5%
    return clamp(base * (drift + noise), 0, 100);
  }
  // good は 95% 前後にブレ幅を抑える（-3〜+1 ポイント）。
  // 対称ノイズにすると monthlyCount が小さいミッション（例 2）で 100% に張り付くため下振れ寄りにする。
  const noise = rng() * 4 - 3; // -3〜+1 ポイント
  return clamp(base + noise, 0, 100);
}

type DynamoItem = Record<string, unknown>;

function buildCompanyItem(spec: CompanySpec, now: string): DynamoItem {
  // 1000〜10000 の範囲で会社ごとに決定論的な保有ポイント。
  const balanceSeed = hashString(`${spec.companyId}:company-point-balance`);
  const companyPointBalance = 1000 + (balanceSeed % 9001); // 1000〜10000
  return {
    companyId: spec.companyId,
    name: spec.name,
    kanaName: spec.kanaName,
    shortName: spec.shortName,
    status: "ACTIVE",
    plan: "STANDARD",
    perEmployeeMonthlyFee: 1000,
    companyPointBalance,
    totalEmployees: USERS.length,
    activeEmployees: USERS.length,
    pointUnitLabel: "pt",
    pointConversionRate: 1,
    pointExpirationMonths: 12,
    timezone: "Asia/Tokyo",
    locale: "ja-JP",
    philosophy: {
      entries: {},
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function buildDepartmentItem(companyId: string, dept: DepartmentTemplate, now: string): DynamoItem {
  return {
    companyId,
    sk: `DEPT#${dept.id}`,
    departmentId: dept.id,
    name: dept.name,
    status: "ACTIVE",
    sortOrder: dept.sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

function buildUserItem(companyId: string, user: PreparedCompany["users"][number], now: string): DynamoItem {
  const emailLower = user.email.toLowerCase();
  return {
    companyId,
    sk: `USER#${user.userId}`,
    userId: user.userId,
    cognitoSub: user.cognitoSub,
    lastName: user.lastName,
    firstName: user.firstName,
    lastNameKana: user.lastNameKana,
    firstNameKana: user.firstNameKana,
    email: user.email,
    departmentId: user.departmentId,
    departmentName: user.departmentName,
    roles: [user.role],
    status: "ACTIVE",
    currentPointBalance: 0,
    currentMonthCompletionRate: 0,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
    gsi1pk: `COGNITO_SUB#${user.cognitoSub}`,
    gsi2pk: `EMAIL#${emailLower}`,
    gsi3pk: `COMPANY#${companyId}#DEPT#${user.departmentId}`,
    gsi3sk: `USER#${user.userId}`,
  };
}

function buildMissionItem(companyId: string, mission: PreparedCompany["missions"][number], now: string): DynamoItem {
  return {
    companyId,
    sk: `MISSION#${mission.slotIndex}`,
    missionId: mission.missionId,
    slotIndex: mission.slotIndex,
    version: 1,
    title: mission.title,
    description: mission.description,
    category: mission.category,
    monthlyCount: mission.monthlyCount,
    score: mission.score,
    enabled: true,
    fields: mission.fields,
    createdAt: now,
    updatedAt: now,
  };
}

function buildMissionHistoryItem(companyId: string, mission: PreparedCompany["missions"][number], now: string, changedByUserId: string): DynamoItem {
  return {
    pk: `COMPANY#${companyId}#MISSION#${mission.missionId}`,
    sk: `VER#1`,
    companyId,
    missionId: mission.missionId,
    slotIndex: mission.slotIndex,
    version: 1,
    title: mission.title,
    description: mission.description,
    category: mission.category,
    monthlyCount: mission.monthlyCount,
    score: mission.score,
    fields: mission.fields,
    validFrom: now,
    validTo: null,
    changedByUserId,
    createdAt: now,
  };
}

function buildMissionReportItem(params: {
  companyId: string;
  userId: string;
  missionId: string;
  missionVersion: number;
  missionTitle: string;
  score: number;
  reportedAt: string;
  reviewedAt: string;
  reportId: string;
  fieldValues: Record<string, string>;
}): DynamoItem {
  const reportId = params.reportId;
  const pk = `COMPANY#${params.companyId}#USER#${params.userId}`;
  const sk = `REPORTED_AT#${params.reportedAt}#REPORT#${reportId}`;
  const gsi1pk = `COMPANY#${params.companyId}`;
  const gsi1sk = `REPORTED_AT#${params.reportedAt}#USER#${params.userId}#REPORT#${reportId}`;
  const gsi2pk = `COMPANY#${params.companyId}#STATUS#APPROVED`;
  const gsi2sk = gsi1sk;
  return {
    pk,
    sk,
    companyId: params.companyId,
    userId: params.userId,
    reportId,
    missionId: params.missionId,
    missionVersion: params.missionVersion,
    missionTitleSnapshot: params.missionTitle,
    scoreSnapshot: params.score,
    scoreGranted: params.score,
    pointGranted: params.score,
    status: "APPROVED",
    reportedAt: params.reportedAt,
    reviewedAt: params.reviewedAt,
    fieldValues: params.fieldValues,
    createdAt: params.reportedAt,
    updatedAt: params.reviewedAt,
    gsi1pk,
    gsi1sk,
    gsi2pk,
    gsi2sk,
  };
}

function buildMonthlyStatsItem(params: {
  companyId: string;
  userId: string;
  yearMonth: string;
  earnedScore: number;
  missionCompletedCount: number;
  completionRate: number;
  updatedAt: string;
}): DynamoItem {
  return {
    pk: `COMPANY#${params.companyId}#USER#${params.userId}`,
    sk: `YM#${params.yearMonth}`,
    companyId: params.companyId,
    userId: params.userId,
    yearMonth: params.yearMonth,
    earnedScore: params.earnedScore,
    earnedPoints: params.earnedScore,
    usedPoints: 0,
    missionCompletedCount: params.missionCompletedCount,
    completionRate: params.completionRate,
    updatedAt: params.updatedAt,
    gsi1pk: `COMPANY#${params.companyId}`,
    gsi1sk: `YM#${params.yearMonth}#USER#${params.userId}`,
  };
}

type WriteBucket = { tableName: string; items: DynamoItem[] };

function addItem(buckets: Map<string, DynamoItem[]>, tableName: string, item: DynamoItem) {
  const list = buckets.get(tableName) ?? [];
  list.push(item);
  buckets.set(tableName, list);
}

async function flushBuckets(client: DynamoDBDocumentClient, buckets: Map<string, DynamoItem[]>): Promise<void> {
  const tasks: WriteBucket[] = [];
  for (const [tableName, items] of buckets.entries()) {
    tasks.push({ tableName, items });
  }
  for (const task of tasks) {
    await writeChunked(client, task.tableName, task.items);
  }
}

async function writeChunked(client: DynamoDBDocumentClient, tableName: string, items: DynamoItem[]): Promise<void> {
  const CHUNK = 25;
  let written = 0;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    let unprocessed: Record<string, { PutRequest: { Item: DynamoItem } }[]> | undefined = {
      [tableName]: chunk.map((item) => ({ PutRequest: { Item: item } })),
    };
    let retry = 0;
    while (unprocessed && Object.keys(unprocessed).length > 0) {
      const response = await client.send(
        new BatchWriteCommand({
          RequestItems: unprocessed,
        }),
      );
      const next = response.UnprocessedItems;
      if (!next || Object.keys(next).length === 0) {
        unprocessed = undefined;
        break;
      }
      unprocessed = next as typeof unprocessed;
      retry += 1;
      if (retry > 5) {
        throw new Error(`BatchWrite to ${tableName} failed to drain after 5 retries`);
      }
      await new Promise((resolve) => setTimeout(resolve, 200 * retry));
    }
    written += chunk.length;
  }
  console.log(`  ${tableName}: ${written} items`);
}

function generateCompany(company: PreparedCompany, now: Date, nowIso: string, yearMonths: string[]): Map<string, DynamoItem[]> {
  const buckets = new Map<string, DynamoItem[]>();
  const { spec, users, missions } = company;

  addItem(buckets, TABLES.company, buildCompanyItem(spec, nowIso));

  for (const dept of DEPARTMENTS) {
    addItem(buckets, TABLES.department, buildDepartmentItem(spec.companyId, dept, nowIso));
  }

  const adminUserId = users.find((u) => u.role === "ADMIN")?.userId ?? users[0].userId;

  for (const user of users) {
    addItem(buckets, TABLES.user, buildUserItem(spec.companyId, user, nowIso));
  }

  for (const mission of missions) {
    addItem(buckets, TABLES.mission, buildMissionItem(spec.companyId, mission, nowIso));
    addItem(buckets, TABLES.missionHistory, buildMissionHistoryItem(spec.companyId, mission, nowIso, adminUserId));
  }

  // 乱数シードは会社 ID ベースで固定。再実行でも同じ分布になる。
  const rng = createSeededRandom(hashString(spec.companyId));

  yearMonths.forEach((ym, monthIndex) => {
    const [yearStr, monthStr] = ym.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const dim = daysInMonth(year, month);

    // 月ごとの得点スケール係数（earnedScore 用、reports とは独立）。
    const scoreFactor = monthlyScoreFactor(spec.pattern, monthIndex, yearMonths.length, rng);

    const perUserReportCounts = new Map<string, Map<number, number>>();
    for (const user of users) {
      perUserReportCounts.set(user.userId, new Map());
    }

    // 会社全体の件数を目標割合から逆算し、ユーザーへ分配することで
    // 端数切り捨てによる表示割合の下振れを避ける。
    for (const mission of missions) {
      const targetRate = missionRateForMonth(mission, spec.pattern, monthIndex, yearMonths.length, rng);
      if (spec.pattern === "poor") {
        // poor 企業は個々の従業員ごとにミッション毎の得意/不得意を設け、
        // レーダーチャートがでこぼこになるよう per-user per-mission でバラつかせる。
        for (const user of users) {
          const bias = userMissionBiasPct(user.userId, mission.slotIndex);
          const userNoise = (rng() - 0.5) * 10; // 月内ノイズ ±5pt
          const userRate = clamp(targetRate + bias + userNoise, 0, 100);
          const count = clamp(Math.round((userRate / 100) * mission.monthlyCount), 0, mission.monthlyCount);
          perUserReportCounts.get(user.userId)!.set(mission.slotIndex, count);
        }
      } else {
        const totalCapacity = mission.monthlyCount * users.length;
        // round だと monthlyCount が小さいミッションで 100% に張り付くため floor を使う。
        const targetTotalReports = clamp(Math.floor((targetRate / 100) * totalCapacity), 0, totalCapacity);
        const base = Math.floor(targetTotalReports / users.length);
        let remainder = targetTotalReports - base * users.length;
        for (const user of users) {
          const bump = remainder > 0 ? 1 : 0;
          if (bump > 0) remainder -= 1;
          const count = clamp(base + bump, 0, mission.monthlyCount);
          perUserReportCounts.get(user.userId)!.set(mission.slotIndex, count);
        }
      }
    }

    for (const user of users) {
      let monthReportCount = 0;
      let monthTargetTotal = 0;

      for (const mission of missions) {
        const reportCount = perUserReportCounts.get(user.userId)!.get(mission.slotIndex) ?? 0;
        monthReportCount += reportCount;
        monthTargetTotal += mission.monthlyCount;

        for (let i = 0; i < reportCount; i += 1) {
          // 日付は月内にユーザー × ミッション × index から決定論的に分散させる。
          const slot = (hashString(`${user.userId}:${mission.slotIndex}:${ym}:${i}`) % (dim * 8 * 3600)) + 1;
          const day = Math.min(dim, 1 + Math.floor(slot / (8 * 3600)));
          const secondsInDay = slot % (8 * 3600);
          const hour = 9 + Math.floor(secondsInDay / 3600);
          const minute = Math.floor((secondsInDay % 3600) / 60);
          const second = secondsInDay % 60;
          const reportedAt = new Date(Date.UTC(year, month, day, hour - 9, minute, second)).toISOString();
          const reviewedAt = new Date(Date.UTC(year, month, Math.min(dim, day + 1), hour - 9, minute, second)).toISOString();
          const reportId = `seed-${spec.companyId}-${user.userId}-m${mission.slotIndex}-${ym}-${String(i).padStart(2, "0")}`;
          const sampleIndex = hashString(`${reportId}:values`) % mission.sampleValues.length;
          const fieldValues = mission.sampleValues[sampleIndex] ?? {};
          addItem(
            buckets,
            TABLES.missionReport,
            buildMissionReportItem({
              companyId: spec.companyId,
              userId: user.userId,
              missionId: mission.missionId,
              missionVersion: 1,
              missionTitle: mission.title,
              score: mission.score,
              reportedAt,
              reviewedAt,
              reportId,
              fieldValues,
            }),
          );
        }
      }

      // earnedScore はトレンドに沿って独立に決める。
      let baseEarned: number;
      if (spec.pattern === "poor") {
        // 70 → 30 の線形傾向にノイズ ±5。
        const targetMean = 64 * scoreFactor; // 係数 1.10 → 0.47 を 70→30 に写像
        const noise = (rng() - 0.5) * 10;
        baseEarned = clamp(targetMean + noise, 0, 100);
      } else {
        // 80 〜 95 を維持。
        const targetMean = 80 + 15 * rng();
        baseEarned = clamp(targetMean, 0, 100);
      }
      const earnedScore = round(baseEarned);
      const completionRate = monthTargetTotal === 0 ? 0 : clamp(round((monthReportCount / monthTargetTotal) * 100), 0, 100);

      addItem(
        buckets,
        TABLES.userMonthlyStats,
        buildMonthlyStatsItem({
          companyId: spec.companyId,
          userId: user.userId,
          yearMonth: ym,
          earnedScore,
          missionCompletedCount: monthReportCount,
          completionRate,
          updatedAt: nowIso,
        }),
      );
    }

    // 月次の交換履歴を 200pt 以上になるよう決定論的に生成。
    const exchangeItems = buildMonthlyExchangeHistory(spec.companyId, users.map((u) => u.userId), ym, year, month, dim);
    for (const item of exchangeItems) {
      addItem(buckets, TABLES.exchangeHistory, item);
    }
  });

  return buckets;
}

const EXCHANGE_MERCHANDISE_CATALOG: Array<{ id: string; name: string; point: number }> = [
  { id: "gift-card-500", name: "Amazonギフトカード 500円分", point: 80 },
  { id: "gift-card-1000", name: "Amazonギフトカード 1000円分", point: 150 },
  { id: "coffee-ticket", name: "社内カフェチケット", point: 50 },
  { id: "lunch-ticket", name: "ランチチケット", point: 100 },
  { id: "book-voucher", name: "書籍購入補助 1000円", point: 120 },
];

function buildMonthlyExchangeHistory(
  companyId: string,
  userIds: string[],
  yearMonth: string,
  year: number,
  monthIndexZeroBased: number,
  dim: number,
): DynamoItem[] {
  const items: DynamoItem[] = [];
  let total = 0;
  let seq = 0;

  // 200pt に達するまで決定論的に交換履歴を積む。
  while (total < 200) {
    const seed = hashString(`${companyId}:exchange:${yearMonth}:${seq}`);
    const userId = userIds[seed % userIds.length] ?? userIds[0];
    const catalog = EXCHANGE_MERCHANDISE_CATALOG[seed % EXCHANGE_MERCHANDISE_CATALOG.length];
    const day = 1 + (seed % dim);
    const hour = 10 + (seed % 8);
    const minute = seed % 60;
    const exchangedAt = new Date(Date.UTC(year, monthIndexZeroBased, day, hour - 9, minute, 0)).toISOString();
    const exchangeId = `seed-${companyId}-${yearMonth}-ex${String(seq).padStart(3, "0")}`;
    const pk = `COMPANY#${companyId}#USER#${userId}`;
    const sk = `EXCHANGED_AT#${exchangedAt}#EXCHANGE#${exchangeId}`;
    items.push({
      pk,
      sk,
      exchangeId,
      companyId,
      userId,
      merchandiseId: catalog.id,
      merchandiseNameSnapshot: catalog.name,
      usedPoint: catalog.point,
      quantity: 1,
      status: "COMPLETED",
      exchangedAt,
      createdAt: exchangedAt,
      gsi1pk: `COMPANY#${companyId}`,
      gsi1sk: `EXCHANGED_AT#${exchangedAt}#USER#${userId}#EXCHANGE#${exchangeId}`,
    });
    total += catalog.point;
    seq += 1;
  }

  return items;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ユーザー × ミッションで決定論的に決まる達成率バイアス (-35〜+35pt)。
// poor 企業のレーダーチャートがでこぼこに見えるよう、得意/不得意を作る。
function userMissionBiasPct(userId: string, slotIndex: number): number {
  const h = hashString(`${userId}:mission-bias:${slotIndex}`);
  return (h % 71) - 35;
}

async function main(): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();
  const yearMonths = listTargetYearMonths(now);

  console.log(`Stage: ${STAGE} / Region: ${REGION} / Profile: ${PROFILE ?? "(default)"}`);
  console.log(`Target months: ${yearMonths[0]} 〜 ${yearMonths[yearMonths.length - 1]} (${yearMonths.length} months)`);

  const client = buildDocumentClient();

  for (const companySpec of COMPANIES) {
    const company = prepareCompany(companySpec);
    console.log(`\nSeeding ${company.spec.companyId} (${company.spec.name}) [${company.spec.pattern}]`);
    const buckets = generateCompany(company, now, nowIso, yearMonths);
    await flushBuckets(client, buckets);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
