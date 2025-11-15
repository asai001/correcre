// scripts/gen-dynamodb-mock.ts
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

  for (const user of users) {
    for (const ym of yearMonths) {
      const [yStr, mStr] = ym.split("-");
      const year = Number(yStr);
      const month = Number(mStr); // 1-12

      // 1ヶ月あたり 70〜95件
      const count = randInt(70, 95);

      const lastDayOfMonth = getLastDayOfMonth(year, month);

      // 2025-11 の場合は「現在日付の 15 日まで」に制限
      const isCurrentMonth = year === CURRENT_DATE.getFullYear() && month === CURRENT_DATE.getMonth() + 1;
      const maxDay = isCurrentMonth ? CURRENT_DATE.getDate() : lastDayOfMonth;

      for (let i = 1; i <= count; i++) {
        const mission = pickRandom(missions);
        const day = randInt(1, maxDay);
        const hour = randInt(8, 19); // 8:00〜19:59 のどこか
        const minute = randInt(0, 59);

        const dt = new Date(year, month - 1, day, hour, minute);
        const reportedAt = dt.toISOString().replace(".000Z", "+09:00"); // ゆるっとJST風に

        // 8割くらい APPROVED、残りPENDING
        const approved = Math.random() < 0.8;
        const status = approved ? "APPROVED" : "PENDING";
        const pointGranted = approved ? mission.pointPerAction : 0;

        const reportId = `mr-${year}${mStr}${String(day).padStart(2, "0")}` + `-${user.userId}-${String(i).padStart(3, "0")}`;

        missionReports.push({
          companyId: user.companyId,
          userId: user.userId,
          reportId,
          missionId: mission.missionId,
          reportedAt,
          status,
          pointGranted,
          comment: `自動生成レポート (${mission.missionId})`,
        });
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
