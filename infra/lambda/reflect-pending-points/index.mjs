// 月初ポイント繰り入れバッチ。
//
// アプリ側のモデル（packages/lib/src/points-reflection.ts と同じ）:
// - currentPointBalance   … 利用可能（反映済み）な残高
// - pendingPointBalance   … 当月ミッションで獲得した未反映分
// - pendingPointYearMonth … pendingPointBalance が属する年月（YYYY-MM, JST）
//
// 「翌月1日に反映」はアプリの読み書き時にも遅延評価で適用されるが、本人が操作しない限り
// DB の保存値は古いままになる。このバッチが毎月1日（JST）に pendingPointYearMonth が
// 前月以前のユーザーの pending を currentPointBalance へ繰り入れて永続化する。
//
// AWS SDK v3 は Lambda の Node.js ランタイムに同梱されているため依存を持たない。
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// packages/lib の nowYYYYMM() と同じく JST 基準の YYYY-MM を返す。
function currentYearMonthJst(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

export async function handler() {
  const tableName = process.env.USER_TABLE_NAME;

  if (!tableName) {
    throw new Error("USER_TABLE_NAME is not set.");
  }

  const currentYearMonth = currentYearMonthJst();
  const nowIso = new Date().toISOString();

  let reflectedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let lastEvaluatedKey;

  do {
    // "YYYY-MM" は辞書順比較で年月の前後を正しく判定できる。
    const scanResult = await documentClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "attribute_exists(pendingPointYearMonth) AND pendingPointYearMonth < :currentYearMonth",
        ExpressionAttributeValues: {
          ":currentYearMonth": currentYearMonth,
        },
        ProjectionExpression: "companyId, sk",
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    for (const item of scanResult.Items ?? []) {
      try {
        // 加算は保存値ベースの相対更新（read-modify-write ではない）ため、報告提出や交換の
        // 楽観ロック付きトランザクションと競合してもポイントを巻き戻さない。ConditionExpression で
        // 「まだ前月以前の pending を持つ」場合に限定しているので、再実行しても二重加算されない。
        await documentClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              companyId: item.companyId,
              sk: item.sk,
            },
            ConditionExpression:
              "attribute_exists(pendingPointYearMonth) AND pendingPointYearMonth < :currentYearMonth",
            UpdateExpression:
              "SET currentPointBalance = if_not_exists(currentPointBalance, :zero) + if_not_exists(pendingPointBalance, :zero), pendingPointBalance = :zero, updatedAt = :updatedAt REMOVE pendingPointYearMonth",
            ExpressionAttributeValues: {
              ":currentYearMonth": currentYearMonth,
              ":zero": 0,
              ":updatedAt": nowIso,
            },
          }),
        );
        reflectedCount += 1;
      } catch (error) {
        if (error?.name === "ConditionalCheckFailedException") {
          // 本人の報告提出・交換などの遅延評価が先に繰り入れを永続化したケース。正常なスキップ。
          skippedCount += 1;
          continue;
        }

        failedCount += 1;
        console.error("Failed to reflect pending points.", {
          companyId: item.companyId,
          sk: item.sk,
          error,
        });
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  const summary = { currentYearMonth, reflectedCount, skippedCount, failedCount };
  console.log("Point reflection batch finished.", summary);

  if (failedCount > 0) {
    // 非同期呼び出し（EventBridge → Lambda）のリトライに失敗を伝えるため throw する。
    // 成功済みユーザーは ConditionExpression により再実行時スキップされる。
    throw new Error(`Failed to reflect pending points for ${failedCount} user(s).`);
  }

  return summary;
}
