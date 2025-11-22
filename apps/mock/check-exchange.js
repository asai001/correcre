import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("./dynamodb.json", "utf8"));

const userCounts = {};
data.ExchangeHistory.forEach(e => {
  userCounts[e.userId] = (userCounts[e.userId] || 0) + 1;
});

console.log("ユーザーごとのExchangeHistory件数:");
Object.entries(userCounts).forEach(([userId, count]) => {
  console.log(`  ${userId}: ${count}件`);
});

console.log("\n月ごとの件数分布（最初の3ユーザー）:");
const users = ["u-001", "u-002", "u-003"];
users.forEach(userId => {
  const userExchanges = data.ExchangeHistory.filter(e => e.userId === userId);
  const monthCounts = {};
  userExchanges.forEach(e => {
    const month = e.exchangedAt.substring(0, 7);
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });
  console.log(`\n${userId}:`);
  const months = Object.keys(monthCounts).sort();
  console.log(`  期間: ${months[0]} ~ ${months[months.length - 1]}`);
  console.log(`  月ごとの件数: ${Object.values(monthCounts).join(", ")}`);
});
