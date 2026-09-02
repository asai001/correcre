import * as path from "node:path";

import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import type { InfraStage } from "./infra-stack";

export interface PointReflectionBatchProps {
  stage: InfraStage;
  userTable: dynamodb.Table;
}

export interface PointReflectionBatch {
  handler: lambda.Function;
  schedule: events.Rule;
  errorAlarm: cloudwatch.Alarm;
}

// ミッション報酬ポイントの「翌月1日反映」を永続化する月初バッチ。
// アプリ側は読み書き時の遅延評価（packages/lib/src/points-reflection.ts）で正しさを担保しているが、
// 本人が操作しないユーザーの DB 保存値は古いままになるため、月初にまとめて繰り入れる。
export function createPointReflectionBatch(scope: Construct, props: PointReflectionBatchProps): PointReflectionBatch {
  const handler = new lambda.Function(scope, "PointReflectionFunction", {
    functionName: `correcre-point-reflection-${props.stage}`,
    description: "Roll previous months' pending mission reward points into the spendable balance.",
    runtime: lambda.Runtime.NODEJS_22_X,
    architecture: lambda.Architecture.ARM_64,
    handler: "index.handler",
    code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/reflect-pending-points")),
    timeout: cdk.Duration.minutes(5),
    memorySize: 256,
    environment: {
      USER_TABLE_NAME: props.userTable.tableName,
    },
  });

  props.userTable.grantReadWriteData(handler);

  // JST の毎月1日 00:05 は UTC では前月末日の 15:05 なので、day-of-month に "L"（月末日）を使う。
  const schedule = new events.Rule(scope, "PointReflectionSchedule", {
    ruleName: `correcre-point-reflection-${props.stage}`,
    description: "Run the monthly point reflection batch at 00:05 JST on the 1st.",
    schedule: events.Schedule.cron({
      minute: "5",
      hour: "15",
      day: "L",
    }),
  });

  schedule.addTarget(
    new targets.LambdaFunction(handler, {
      retryAttempts: 2,
    }),
  );

  // バッチが黙って失敗すると管理画面のポイント表示が古いまま残るため、失敗を CloudWatch アラームで可視化する。
  // 通知アクションは未設定なので、必要に応じて SNS トピック等を追加すること。
  const errorAlarm = new cloudwatch.Alarm(scope, "PointReflectionErrorAlarm", {
    alarmName: `correcre-point-reflection-errors-${props.stage}`,
    alarmDescription: "The monthly point reflection batch failed. Pending points were not rolled into balances.",
    metric: handler.metricErrors({
      period: cdk.Duration.hours(1),
      statistic: "Sum",
    }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  });

  return { handler, schedule, errorAlarm };
}
