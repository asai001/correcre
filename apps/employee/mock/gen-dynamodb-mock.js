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

  const START_YM = "2024-11";
  const END_YM = "2025-11";
  const CURRENT_DATE = new Date("2025-11-15T00:00:00+09:00");

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

  const output = {
    ...base,
    MissionReports: missionReports,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`Generated ${missionReports.length} MissionReports to ${outPath}`);
}

main();
