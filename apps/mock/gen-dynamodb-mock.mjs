import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const JST_OFFSET = "+09:00";
const REPORT_MONTHS = 13;
const EXCHANGE_MONTHS = 24;
const TARGET_RATE_BASE = 85;
const TARGET_RATE_SWING = 2;
const DASHBOARD_MODAL_TARGET_USER_ID = "u-002";
const DASHBOARD_MODAL_OPEN_MISSION_IDS = new Set(["growth", "improve"]);
const DASHBOARD_MODAL_APPROVED_COUNT = 3;

const EXTRA_USER_PROFILES = [
  { userId: "u-005", name: "伊藤 健太", department: "営業部", joinedAt: "2023-06-01", roles: ["EMPLOYEE"] },
  { userId: "u-006", name: "渡辺 美咲", department: "技術部", joinedAt: "2022-09-01", roles: ["EMPLOYEE"] },
  { userId: "u-007", name: "中村 亮介", department: "総務部", joinedAt: "2021-12-01", roles: ["EMPLOYEE"] },
  { userId: "u-008", name: "小林 彩乃", department: "人事部", joinedAt: "2024-01-15", roles: ["EMPLOYEE"] },
  { userId: "u-009", name: "加藤 颯太", department: "製造部", joinedAt: "2022-05-01", roles: ["EMPLOYEE"] },
  { userId: "u-010", name: "吉田 明日香", department: "営業部", joinedAt: "2023-08-01", roles: ["EMPLOYEE"] },
  { userId: "u-011", name: "山本 翼", department: "技術部", joinedAt: "2021-11-01", roles: ["EMPLOYEE"] },
  { userId: "u-012", name: "松本 里奈", department: "マーケティング部", joinedAt: "2022-07-01", roles: ["EMPLOYEE"] },
  { userId: "u-013", name: "井上 海斗", department: "品質管理部", joinedAt: "2023-02-01", roles: ["EMPLOYEE"] },
  { userId: "u-014", name: "木村 千尋", department: "営業部", joinedAt: "2024-04-01", roles: ["EMPLOYEE"] },
  { userId: "u-015", name: "斎藤 恒一", department: "技術部", joinedAt: "2022-03-01", roles: ["EMPLOYEE"] },
  { userId: "u-016", name: "清水 優奈", department: "総務部", joinedAt: "2023-10-01", roles: ["EMPLOYEE"] },
  { userId: "u-017", name: "阿部 恒一", department: "製造部", joinedAt: "2021-06-01", roles: ["EMPLOYEE"] },
  { userId: "u-018", name: "森 ひかり", department: "人事部", joinedAt: "2024-05-01", roles: ["EMPLOYEE"] },
];

const MERCHANDISE_LIST = [
  { name: "ミネラルウォーター 500ml 24本セット", points: 320 },
  { name: "お米 5kg", points: 600 },
  { name: "有名店の焼き菓子 6個セット", points: 166 },
  { name: "入浴剤セット", points: 60 },
  { name: "カタログギフト", points: 240 },
  { name: "高級タオルセット", points: 400 },
  { name: "文房具セット", points: 100 },
  { name: "コーヒーギフトセット", points: 200 },
];

function parseYearMonth(ym) {
  const [year, month] = ym.split("-").map(Number);
  return { year, month };
}

function enumerateYearMonths(startYm, endYm) {
  const out = [];
  const start = parseYearMonth(startYm);
  const end = parseYearMonth(endYm);

  let year = start.year;
  let month = start.month;

  while (year < end.year || (year === end.year && month <= end.month)) {
    out.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return out;
}

function shiftYearMonth(ym, offset) {
  const { year, month } = parseYearMonth(ym);
  const shifted = new Date(year, month - 1 + offset, 1);
  return toYearMonth(shifted);
}

function toYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getLastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid MOCK_END_DATE: ${value}. Expected YYYY-MM-DD.`);
  }

  const [, yStr, mStr, dStr] = match;
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const lastDay = getLastDayOfMonth(year, month);

  if (month < 1 || month > 12 || day < 1 || day > lastDay) {
    throw new Error(`Invalid MOCK_END_DATE: ${value}.`);
  }

  return new Date(year, month - 1, day);
}

function hashString(value) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function randomFloat(key) {
  return hashString(key) / 0xffffffff;
}

function intFromKey(key, min, max) {
  if (max <= min) {
    return min;
  }

  return min + (hashString(key) % (max - min + 1));
}

function sortByKey(values, keyPrefix) {
  return [...values].sort((a, b) => {
    const left = hashString(`${keyPrefix}:${a}`);
    const right = hashString(`${keyPrefix}:${b}`);

    if (left === right) {
      return String(a).localeCompare(String(b));
    }

    return left - right;
  });
}

function formatJstDateTime(year, month, day, hour, minute) {
  return [
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    `T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${JST_OFFSET}`,
  ].join("");
}

function buildUsers(baseUsers, targetCount, endDate) {
  const users = [...baseUsers];

  while (users.length < targetCount) {
    const profile = EXTRA_USER_PROFILES[users.length - baseUsers.length];
    if (!profile) {
      throw new Error(`Not enough extra user profiles for targetCount=${targetCount}`);
    }

    users.push({
      companyId: baseUsers[0]?.companyId ?? "em",
      userId: profile.userId,
      name: profile.name,
      department: profile.department,
      joinedAt: profile.joinedAt,
      roles: profile.roles,
    });
  }

  return users.slice(0, targetCount).map((user, index) => {
    const loginDay = Math.max(1, endDate.getDate() - intFromKey(`${user.userId}:lastLoginDay`, 0, 4));
    const loginHour = intFromKey(`${user.userId}:lastLoginHour`, 8, 19);
    const loginMinute = intFromKey(`${user.userId}:lastLoginMinute`, 0, 59);

    return {
      companyId: user.companyId,
      userId: user.userId,
      name: user.name,
      department: user.department ?? EXTRA_USER_PROFILES[index - baseUsers.length]?.department ?? "営業部",
      joinedAt: user.joinedAt ?? EXTRA_USER_PROFILES[index - baseUsers.length]?.joinedAt ?? "2023-01-01",
      lastLoginAt: formatJstDateTime(endDate.getFullYear(), endDate.getMonth() + 1, loginDay, loginHour, loginMinute),
      currentPointBalance: 0,
      currentMonthCompletionRate: 0,
      roles: user.roles ?? ["EMPLOYEE"],
    };
  });
}

function allocateCounts(total, userCount, capPerUser, key) {
  const counts = Array(userCount).fill(Math.floor(total / userCount));
  const remainder = total - counts[0] * userCount;
  const orderedIndexes = sortByKey(
    Array.from({ length: userCount }, (_, index) => index),
    `${key}:remainder`
  );

  for (let i = 0; i < remainder; i += 1) {
    counts[orderedIndexes[i]] += 1;
  }

  for (const count of counts) {
    if (count > capPerUser) {
      throw new Error(`Allocation overflow for ${key}`);
    }
  }

  return counts;
}

function resolveApprovedCountForDashboardDemo(isEndMonth, missionId, userId, approvedCount, monthlyCount) {
  if (!isEndMonth || userId !== DASHBOARD_MODAL_TARGET_USER_ID || !DASHBOARD_MODAL_OPEN_MISSION_IDS.has(missionId)) {
    return approvedCount;
  }

  return Math.min(DASHBOARD_MODAL_APPROVED_COUNT, monthlyCount);
}

function buildMissionReports(users, missions, yearMonths, effectiveEndDate) {
  const missionReports = [];
  const userIds = users.map((user) => user.userId);

  for (const ym of yearMonths) {
    const { year, month } = parseYearMonth(ym);
    const lastDayOfMonth = getLastDayOfMonth(year, month);
    const isEndMonth = ym === toYearMonth(effectiveEndDate);
    const maxDay = isEndMonth ? Math.min(effectiveEndDate.getDate(), lastDayOfMonth) : lastDayOfMonth;

    for (const mission of missions) {
      const monthlyTarget = mission.monthlyCount * users.length;
      const rate = TARGET_RATE_BASE + intFromKey(`${ym}:${mission.missionId}:rate`, -TARGET_RATE_SWING, TARGET_RATE_SWING);
      const approvedTotal = Math.round((monthlyTarget * rate) / 100);
      const approvedCounts = allocateCounts(approvedTotal, users.length, mission.monthlyCount, `${ym}:${mission.missionId}:approved`);

      for (const [index, userId] of userIds.entries()) {
        const approvedCount = resolveApprovedCountForDashboardDemo(
          isEndMonth,
          mission.missionId,
          userId,
          approvedCounts[index],
          mission.monthlyCount
        );
        const spareCapacity = mission.monthlyCount - approvedCount;
        const pendingCount =
          spareCapacity > 0 && randomFloat(`${ym}:${mission.missionId}:${userId}:pendingChance`) < 0.28 ? 1 : 0;
        const totalCount = approvedCount + pendingCount;

        for (let sequence = 0; sequence < totalCount; sequence += 1) {
          const isApproved = sequence < approvedCount;
          const baseKey = `${ym}:${mission.missionId}:${userId}:${sequence}`;
          const day = ((hashString(`${baseKey}:day`) + sequence * 7) % maxDay) + 1;
          const hour = intFromKey(`${baseKey}:hour`, 8, 19);
          const minute = intFromKey(`${baseKey}:minute`, 0, 59);

          missionReports.push({
            companyId: users[index].companyId,
            userId,
            reportId: `mr-${ym.replace("-", "")}-${mission.missionId}-${userId}-${String(sequence + 1).padStart(2, "0")}`,
            missionId: mission.missionId,
            reportedAt: formatJstDateTime(year, month, day, hour, minute),
            status: isApproved ? "APPROVED" : "PENDING",
            pointGranted: isApproved ? mission.score * 5 : 0,
            scoreGranted: isApproved ? mission.score : 0,
            comment: `自動生成レポート(${mission.missionId})`,
          });
        }
      }
    }
  }

  return missionReports.sort((a, b) => {
    const timeDiff = new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return a.reportId.localeCompare(b.reportId);
  });
}

function buildExchangeHistory(users, effectiveEndDate) {
  const exchangeEndYm = toYearMonth(effectiveEndDate);
  const exchangeStartYm = shiftYearMonth(exchangeEndYm, -(EXCHANGE_MONTHS - 1));
  const exchangeYearMonths = enumerateYearMonths(exchangeStartYm, exchangeEndYm);
  const exchangeHistory = [];
  let exchangeCounter = 1;

  for (const ym of exchangeYearMonths) {
    const { year, month } = parseYearMonth(ym);
    const lastDayOfMonth = getLastDayOfMonth(year, month);
    const isEndMonth = ym === exchangeEndYm;
    const maxDay = isEndMonth ? Math.min(effectiveEndDate.getDate(), lastDayOfMonth) : lastDayOfMonth;

    for (const [index, user] of users.entries()) {
      const chance = randomFloat(`${ym}:${user.userId}:exchangeCount`);
      let exchangeCount = chance < 0.52 ? 0 : 1;
      if (chance > 0.92) {
        exchangeCount = 2;
      }
      if (isEndMonth && index < 4) {
        exchangeCount = Math.max(exchangeCount, 1);
      }

      for (let sequence = 0; sequence < exchangeCount; sequence += 1) {
        const key = `${ym}:${user.userId}:exchange:${sequence}`;
        const day = isEndMonth && sequence === 0 && index < 4 ? maxDay : ((hashString(`${key}:day`) + sequence * 5) % maxDay) + 1;
        const hour = intFromKey(`${key}:hour`, 9, 18);
        const minute = intFromKey(`${key}:minute`, 0, 59);
        const merchandise = MERCHANDISE_LIST[intFromKey(`${key}:item`, 0, MERCHANDISE_LIST.length - 1)];

        exchangeHistory.push({
          companyId: user.companyId,
          userId: user.userId,
          exchangeId: `ex-${ym.replace("-", "")}${String(day).padStart(2, "0")}-${String(exchangeCounter).padStart(4, "0")}`,
          exchangedAt: formatJstDateTime(year, month, day, hour, minute),
          merchandiseName: merchandise.name,
          usedPoint: merchandise.points,
        });

        exchangeCounter += 1;
      }
    }
  }

  return exchangeHistory.sort((a, b) => {
    const timeDiff = new Date(a.exchangedAt).getTime() - new Date(b.exchangedAt).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return a.exchangeId.localeCompare(b.exchangeId);
  });
}

function buildUserMonthlyStats(users, missions, missionReports, exchangeHistory, statsYearMonths) {
  const targetScorePerMonth = missions.reduce((sum, mission) => sum + mission.monthlyCount * mission.score, 0);
  const approvedReportCountMap = new Map();
  const approvedScoreMap = new Map();
  const exchangePointsMap = new Map();

  for (const report of missionReports) {
    if (report.status !== "APPROVED") {
      continue;
    }

    const yearMonth = report.reportedAt.slice(0, 7);
    const key = `${report.companyId}#${report.userId}:${yearMonth}`;
    approvedReportCountMap.set(key, (approvedReportCountMap.get(key) ?? 0) + 1);
    approvedScoreMap.set(key, (approvedScoreMap.get(key) ?? 0) + (report.scoreGranted ?? 0));
  }

  for (const exchange of exchangeHistory) {
    const yearMonth = exchange.exchangedAt.slice(0, 7);
    const key = `${exchange.companyId}#${exchange.userId}:${yearMonth}`;
    exchangePointsMap.set(key, (exchangePointsMap.get(key) ?? 0) + exchange.usedPoint);
  }

  const userMonthlyStats = [];

  for (const user of users) {
    for (const yearMonth of statsYearMonths) {
      const statKey = `${user.companyId}#${user.userId}:${yearMonth}`;
      const actualScore = approvedScoreMap.get(statKey) ?? 0;
      const actualCount = approvedReportCountMap.get(statKey) ?? 0;
      const usedPoints = exchangePointsMap.get(statKey) ?? 0;
      const earnedScore = targetScorePerMonth === 0 ? 0 : Math.round((actualScore / targetScorePerMonth) * 100);
      const earnedPoints = actualScore * 5 + intFromKey(`${user.userId}:${yearMonth}:earnedPointsBonus`, 12, 36);

      userMonthlyStats.push({
        companyUserKey: `${user.companyId}#${user.userId}`,
        yearMonth,
        earnedPoints,
        earnedScore,
        usedPoints,
        completionRate: earnedScore,
        missionCompletedCount: actualCount,
      });
    }
  }

  return userMonthlyStats.sort((a, b) => {
    if (a.companyUserKey === b.companyUserKey) {
      return a.yearMonth.localeCompare(b.yearMonth);
    }

    return a.companyUserKey.localeCompare(b.companyUserKey);
  });
}

function enrichUsers(users, userMonthlyStats, effectiveEndDate) {
  const statsEndYm = toYearMonth(effectiveEndDate);
  const recentMonths = enumerateYearMonths(shiftYearMonth(statsEndYm, -2), statsEndYm);
  const statsByUserAndMonth = new Map(
    userMonthlyStats.map((stat) => [`${stat.companyUserKey}:${stat.yearMonth}`, stat])
  );

  return users.map((user) => {
    const companyUserKey = `${user.companyId}#${user.userId}`;
    const currentStat = statsByUserAndMonth.get(`${companyUserKey}:${statsEndYm}`);
    const recentStats = recentMonths
      .map((yearMonth) => statsByUserAndMonth.get(`${companyUserKey}:${yearMonth}`))
      .filter(Boolean);

    const earnedPoints = recentStats.reduce((sum, stat) => sum + stat.earnedPoints, 0);
    const usedPoints = recentStats.reduce((sum, stat) => sum + stat.usedPoints, 0);
    const baseBalance = intFromKey(`${user.userId}:baseBalance`, 280, 920);

    return {
      ...user,
      currentPointBalance: Math.max(0, baseBalance + earnedPoints - usedPoints),
      currentMonthCompletionRate: currentStat?.completionRate ?? 0,
    };
  });
}

function buildCompany(company, users, effectiveEndDate) {
  const updatedAt = formatJstDateTime(
    effectiveEndDate.getFullYear(),
    effectiveEndDate.getMonth() + 1,
    effectiveEndDate.getDate(),
    18,
    0
  );

  return {
    ...company,
    totalEmployees: users.length,
    activeEmployees: users.length,
    updatedAt,
  };
}

function buildPhilosophy(philosophy, effectiveEndDate) {
  if (!philosophy) {
    return philosophy;
  }

  return {
    ...philosophy,
    updatedAt: formatJstDateTime(
      effectiveEndDate.getFullYear(),
      effectiveEndDate.getMonth() + 1,
      effectiveEndDate.getDate(),
      18,
      0
    ),
  };
}

function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const basePath = path.join(scriptDir, "dynamodb.base.json");
  const outPath = path.join(scriptDir, "dynamodb.json");

  const raw = fs.readFileSync(basePath, "utf8");
  const base = JSON.parse(raw);

  const effectiveEndDate = process.env.MOCK_END_DATE ? parseDateOnly(process.env.MOCK_END_DATE) : new Date();
  const endYm = toYearMonth(effectiveEndDate);
  const startYm = shiftYearMonth(endYm, -(REPORT_MONTHS - 1));
  const reportYearMonths = enumerateYearMonths(startYm, endYm);

  const baseCompany = base.Company?.[0];
  if (!baseCompany) {
    throw new Error("Company base data is missing.");
  }

  const missions = (base.Mission ?? []).filter((mission) => mission.enabled);
  const users = buildUsers(base.User ?? [], baseCompany.activeEmployees ?? 18, effectiveEndDate);
  const missionReports = buildMissionReports(users, missions, reportYearMonths, effectiveEndDate);
  const exchangeHistory = buildExchangeHistory(users, effectiveEndDate);
  const userMonthlyStats = buildUserMonthlyStats(users, missions, missionReports, exchangeHistory, reportYearMonths);
  const enrichedUsers = enrichUsers(users, userMonthlyStats, effectiveEndDate);
  const company = buildCompany(baseCompany, enrichedUsers, effectiveEndDate);
  const philosophy = buildPhilosophy(base.Philosophy?.[0], effectiveEndDate);

  const output = {
    ...base,
    Company: [company],
    User: enrichedUsers,
    MissionReports: missionReports,
    UserMonthlyStats: userMonthlyStats,
    ExchangeHistory: exchangeHistory,
    Philosophy: philosophy ? [philosophy] : [],
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(
    `Generated ${missionReports.length} MissionReports, ${userMonthlyStats.length} UserMonthlyStats, and ${exchangeHistory.length} ExchangeHistory to ${outPath} (end=${process.env.MOCK_END_DATE ?? "today"})`
  );
}

main();
