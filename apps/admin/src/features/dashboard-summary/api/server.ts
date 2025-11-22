// "use server";

// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
// import type { DashboardSummary } from "../model/types";

// // テーブル名は環境変数から渡す想定
// const USER_TABLE_NAME = process.env.DDB_USER_TABLE_NAME!;
// const USER_MONTHLY_STATS_TABLE_NAME = process.env.DDB_USER_MONTHLY_STATS_TABLE_NAME!;

// // v3 クライアント
// const ddbClient = DynamoDBDocumentClient.from(
//   new DynamoDBClient({
//     region: process.env.AWS_REGION,
//   })
// );

// // ==== ユーティリティ ====

// // JST ベースで "YYYY-MM" を返す
// function getYearMonth(offsetMonth = 0): string {
//   const now = new Date();
//   // JST に寄せたい場合はここで 9 時間足してもOK
//   const d = new Date(now.getFullYear(), now.getMonth() + offsetMonth, 1);
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, "0");
//   return `${y}-${m}`;
// }

// // User テーブルから現在のポイント・今月の達成割合を取得
// async function getUserSnapshot(companyId: string, userId: string) {
//   // 想定スキーマ:
//   // - PK: companyId
//   // - SK: userId
//   const cmd = new GetCommand({
//     TableName: USER_TABLE_NAME,
//     Key: {
//       companyId,
//       userId,
//     },
//   });

//   const { Item } = await ddbClient.send(cmd);

//   if (!Item) {
//     return null;
//   }

//   return {
//     currentPointBalance: Item.currentPointBalance ?? 0,
//     // 今月の達成割合は User にキャッシュしてある想定
//     thisMonthCompletionRate: Item.currentMonthCompletionRate ?? 0,
//   };
// }

// // UserMonthlyStats テーブルから先月の獲得ポイントを取得
// async function getLastMonthStats(companyId: string, userId: string) {
//   const lastMonth = getYearMonth(-1);

//   // 想定スキーマ:
//   // - PK: companyUserKey = `${companyId}#${userId}`
//   // - SK: yearMonth (例: "2025-11")
//   const cmd = new GetCommand({
//     TableName: USER_MONTHLY_STATS_TABLE_NAME,
//     Key: {
//       companyUserKey: `${companyId}#${userId}`,
//       yearMonth: lastMonth,
//     },
//   });

//   const { Item } = await ddbClient.send(cmd);

//   if (!Item) {
//     return {
//       yearMonth: lastMonth,
//       earnedPoints: 0,
//     };
//   }

//   return {
//     yearMonth: Item.yearMonth as string,
//     earnedPoints: Item.earnedPoints ?? 0,
//   };
// }

// /**
//  * DynamoDB からダッシュボード上部 3タイル分の値を組み立てる
//  *
//  * - User テーブル … currentPointBalance / currentMonthCompletionRate
//  * - UserMonthlyStats テーブル … 先月の earnedPoints
//  */
// export async function getDashboardSummaryFromDynamo(companyId: string, userId: string): Promise<DashboardSummary | null> {
//   // 並列に取得
//   const [userSnapshot, lastMonthStats] = await Promise.all([getUserSnapshot(companyId, userId), getLastMonthStats(companyId, userId)]);

//   if (!userSnapshot) {
//     // ユーザーが存在しなければ null
//     return null;
//   }

//   return {
//     thisMonthCompletionRate: userSnapshot.thisMonthCompletionRate,
//     currentPointBalance: userSnapshot.currentPointBalance,
//     lastMonthEarnedPoints: lastMonthStats.earnedPoints,
//   };
// }
