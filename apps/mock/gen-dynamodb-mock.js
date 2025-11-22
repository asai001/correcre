import fs from "node:fs";
import path from "node:path";

/** YYYY-MM → Date(year, monthIndex, 1) */
function parseYearMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/** YYYY-MM 列挙（両端含む） */
function enumerateYearMonths(startYm, endYm) {
  const out = [];
  let d = parseYearMonth(startYm);
  const end = parseYearMonth(endYm);

  while (d <= end) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${y}-${m}`);

    d = new Date(y, d.getMonth() + 1, 1);
  }

  return out;
}

/** Date → "YYYY-MM" */
function toYearMonth(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function randInt(min, max) {
  // min <= n <= max
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[randInt(0, arr.length - 1)];
}

/** 指定年月の末日を返す */
function getLastDayOfMonth(year, month1to12) {
  return new Date(year, month1to12, 0).getDate();
}

function main() {
  const basePath = path.resolve("./dynamodb.base.json");
  const outPath = path.resolve("./dynamodb.json");

  const raw = fs.readFileSync(basePath, "utf8");
  const base = JSON.parse(raw);

  const users = base.User;
  const missions = base.Mission;

  // ★ 実行時の現在日時
  const CURRENT_DATE = new Date();

  // ★ CURRENT_DATE が属する月を END_YM に
  const endDate = new Date(CURRENT_DATE.getFullYear(), CURRENT_DATE.getMonth(), 1);
  const END_YM = toYearMonth(endDate);

  // ★ そこから 12 ヶ月前の月を START_YM に（合計 13 ヶ月分）
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 12, 1);
  const START_YM = toYearMonth(startDate);

  const yearMonths = enumerateYearMonths(START_YM, END_YM);

  const missionReports = [];

  // ★ user + missionId + yyyymm ごとの件数カウンタ
  //    key: `${companyId}:${userId}:${missionId}:${yyyymm}`
  const perUserMissionMonthCount = new Map();

  function getUserMissionMonthCount(companyId, userId, missionId, ym) {
    const key = `${companyId}:${userId}:${missionId}:${ym}`;
    return perUserMissionMonthCount.get(key) ?? 0;
  }

  function incUserMissionMonth(companyId, userId, missionId, ym) {
    const key = `${companyId}:${userId}:${missionId}:${ym}`;
    const current = perUserMissionMonthCount.get(key) ?? 0;
    perUserMissionMonthCount.set(key, current + 1);
  }

  for (const user of users) {
    for (const ym of yearMonths) {
      const [yStr, mStr] = ym.split("-");
      const year = Number(yStr);
      const month = Number(mStr); // 1-12

      // 1ヶ月あたり 70〜95件（※実際には monthlyCount の合計次第でこれ未満になることもある）
      const count = randInt(70, 95);

      const lastDayOfMonth = getLastDayOfMonth(year, month);

      // 2025-11 の場合は「現在日付の 15 日まで」に制限
      const isCurrentMonth = year === CURRENT_DATE.getFullYear() && month === CURRENT_DATE.getMonth() + 1;
      const maxDay = isCurrentMonth ? CURRENT_DATE.getDate() : lastDayOfMonth;

      for (let i = 1; i <= count; i++) {
        let mission = null;

        // ★ 同じ user + missionId + 月 の件数が monthlyCount 未満のものを探す
        //    無限ループ防止のため、試行は最大 20 回くらいに制限
        for (let trial = 0; trial < 20; trial++) {
          const candidate = pickRandom(missions);

          const missionId = candidate.missionId;
          // Mission 側に monthlyCount（または monthlyCount）を持たせている前提
          const monthlyLimit = candidate.monthlyCount ?? candidate.monthlyCount ?? Infinity;

          const currentCount = getUserMissionMonthCount(user.companyId, user.userId, missionId, ym);

          if (currentCount < monthlyLimit) {
            mission = candidate;
            break;
          }
        }

        // すべてのミッションが上限に達しているなどで選べなかった場合、
        // これ以上このユーザー・この月にレポートを追加できないのでループを抜ける
        if (!mission) {
          break;
        }

        const day = randInt(1, maxDay);
        const hour = randInt(8, 19); // 8:00〜19:59 のどこか
        const minute = randInt(0, 59);

        const dt = new Date(year, month - 1, day, hour, minute);
        const reportedAt = dt.toISOString().replace(".000Z", "+09:00"); // ゆるっとJST風に

        // 8割くらい APPROVED、残りPENDING
        const approved = Math.random() < 0.8;
        const status = approved ? "APPROVED" : "PENDING";
        const pointGranted = approved ? mission.pointPerAction : 0;
        const scoreGranted = mission.score;

        const reportId = `mr-${year}${mStr}${String(day).padStart(2, "0")}` + `-${user.userId}-${String(i).padStart(3, "0")}`;

        missionReports.push({
          companyId: user.companyId,
          userId: user.userId,
          reportId,
          missionId: mission.missionId,
          reportedAt,
          status,
          pointGranted,
          scoreGranted,
          comment: `自動生成レポート (${mission.missionId})`,
        });

        // ★ カウンタ更新（user + missionId + 月）
        incUserMissionMonth(user.companyId, user.userId, mission.missionId, ym);
      }
    }
  }

  // ---- ExchangeHistory の自動生成 ----
  const exchangeHistory = [];

  // 商品リスト（金銭価値のある商品は除外、1ポイント=5円換算）
  const merchandiseList = [
    { name: "幾重 プレミアム シャンプー＆トリートメント 500ml セット", points: 320 }, // 1600円相当
    { name: "ダイヤモンドライス 5kg", points: 600 }, // 3000円相当
    { name: "秀吉のごほうび「生」くりーむぱん　6個入り", points: 166 }, // 830円相当
    { name: "お菓子セット", points: 60 }, // 300円相当
    { name: "家電カタログギフト", points: 240 }, // 1200円相当
    { name: "高級タオルセット", points: 400 }, // 2000円相当
    { name: "入浴剤ギフトセット", points: 100 }, // 500円相当
    { name: "コーヒーギフトセット", points: 200 }, // 1000円相当
  ];

  // 過去24ヶ月分のExchangeHistoryを生成
  const exchangeStartDate = new Date(CURRENT_DATE.getFullYear(), CURRENT_DATE.getMonth() - 23, 1);
  const exchangeStartYm = toYearMonth(exchangeStartDate);
  const exchangeEndYm = END_YM;
  const exchangeYearMonths = enumerateYearMonths(exchangeStartYm, exchangeEndYm);

  let exchangeCounter = 1; // exchangeId用のカウンター

  for (const user of users) {
    for (const ym of exchangeYearMonths) {
      const [yStr, mStr] = ym.split("-");
      const year = Number(yStr);
      const month = Number(mStr); // 1-12

      // 1ヶ月あたり 0〜2件のランダムな件数
      const exchangeCount = randInt(0, 2);

      const lastDayOfMonth = getLastDayOfMonth(year, month);

      // 現在月の場合は現在日付まで
      const isCurrentMonth = year === CURRENT_DATE.getFullYear() && month === CURRENT_DATE.getMonth() + 1;
      const maxDay = isCurrentMonth ? CURRENT_DATE.getDate() : lastDayOfMonth;

      for (let i = 0; i < exchangeCount; i++) {
        const day = randInt(1, maxDay);
        const hour = randInt(9, 18); // 9:00〜18:59
        const minute = randInt(0, 59);

        const dt = new Date(year, month - 1, day, hour, minute);
        const exchangedAt = dt.toISOString().replace(".000Z", "+09:00");

        const merchandise = pickRandom(merchandiseList);

        const exchangeId = `ex-${year}${mStr}${String(day).padStart(2, "0")}-${String(exchangeCounter).padStart(4, "0")}`;
        exchangeCounter++;

        exchangeHistory.push({
          companyId: user.companyId,
          userId: user.userId,
          exchangeId,
          exchangedAt,
          merchandiseName: merchandise.name,
          usedPoint: merchandise.points,
        });
      }
    }
  }

  // ---- UserMonthlyStats の自動生成 ----
  const userMonthlyStats = [];
  const lastMonthDate = new Date(CURRENT_DATE.getFullYear(), CURRENT_DATE.getMonth() - 1, 1);

  for (const user of users) {
    const monthsCount = randInt(10, 30); // ★ 1ユーザーあたり 10〜30件

    // lastMonthDate から monthsCount-1 ヶ月さかのぼった月を開始月にする
    const firstDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() - (monthsCount - 1), 1);

    const startYm = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, "0")}`;
    const endYm = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    const yms = enumerateYearMonths(startYm, endYm); // 両端含む YYYY-MM の配列

    for (const ym of yms) {
      const earnedPoints = randInt(300, 600); // ★ 300〜600

      const missionTargetCount = 20;
      const completionRate = randInt(60, 100);
      const missionCompletedCount = Math.round((missionTargetCount * completionRate) / 100);
      const usedPoints = randInt(0, Math.min(earnedPoints, 200));

      userMonthlyStats.push({
        companyUserKey: `${user.companyId}#${user.userId}`,
        yearMonth: ym,
        earnedPoints,
        usedPoints,
        completionRate,
        missionCompletedCount,
        missionTargetCount,
      });
    }
  }

  const output = {
    ...base,
    MissionReports: missionReports,
    UserMonthlyStats: userMonthlyStats,
    ExchangeHistory: exchangeHistory,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`Generated ${missionReports.length} MissionReports, ${userMonthlyStats.length} UserMonthlyStats, and ${exchangeHistory.length} ExchangeHistory to ${outPath}`);
}

main();
