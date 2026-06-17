#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";

import { InfraStack, type InfraStage } from "../lib/infra-stack";

type EnvironmentConfig = {
  stage: InfraStage;
  account: string;
  region: string;
  adminUrl: string;
  employeeUrl: string;
  operatorUrl: string;
  merchantUrl: string;
  sourceContext: string;
};

const environments: EnvironmentConfig[] = [
  {
    stage: "dev",
    account: "134606630920",
    region: "ap-northeast-1",
    adminUrl: "https://dev.correcre-admin.vercel.app/",
    employeeUrl: "https://dev.correcre-employee.vercel.app/",
    operatorUrl: "https://dev.correcre-operator.vercel.app/",
    merchantUrl: "https://dev.correcre-merchant.vercel.app/",
    sourceContext: "local",
  },
  {
    stage: "stg",
    account: "622550700840",
    region: "ap-northeast-1",
    // 実際にデプロイされている Vercel の git-stage URL を指定する。
    // ここが実 URL と一致していないと S3 バケットの CORS 許可オリジンが合わず、
    // presigned URL への直 PUT がプリフライトで弾かれて画像アップロードに失敗する。
    adminUrl: "https://correcre-admin-git-stage-asai001s-projects-3e71fbe6.vercel.app/",
    employeeUrl: "https://correcre-employee-git-stage-asai001s-projects-3e71fbe6.vercel.app/",
    operatorUrl: "https://correcre-operator-git-stage-asai001s-projects-3e71fbe6.vercel.app/",
    merchantUrl: "https://correcre-merchant-git-stage-asai001s-projects-3e71fbe6.vercel.app/",
    sourceContext: "stage",
  },
  {
    stage: "prod",
    account: "923520716541",
    region: "ap-northeast-1",
    // 本番はカスタムドメインで配信している（cognito.ts のログイン URL と一致させる）。
    // ここが実アクセス元のオリジンと一致していないと S3 バケットの CORS 許可オリジンが合わず、
    // presigned URL への直 PUT がプリフライトで弾かれて画像アップロードに失敗する。
    adminUrl: "https://admin.correcre.jp/",
    employeeUrl: "https://app.correcre.jp/",
    operatorUrl: "https://operator.correcre.jp/",
    merchantUrl: "https://merchant.correcre.jp/",
    sourceContext: "main",
  },
];

const app = new cdk.App();

for (const environment of environments) {
  const stageLabel = environment.stage.charAt(0).toUpperCase() + environment.stage.slice(1);
  const stack = new InfraStack(app, `Correcre${stageLabel}InfraStack`, {
    env: {
      account: environment.account,
      region: environment.region,
    },
    stage: environment.stage,
    adminAppUrl: environment.adminUrl,
    employeeAppUrl: environment.employeeUrl,
    operatorAppUrl: environment.operatorUrl,
    merchantAppUrl: environment.merchantUrl,
    sourceContext: environment.sourceContext,
    description: `Correcre ${environment.stage} infrastructure stack`,
  });

  cdk.Tags.of(stack).add("Project", "correcre");
  cdk.Tags.of(stack).add("Environment", environment.stage);
  cdk.Tags.of(stack).add("SourceContext", environment.sourceContext);
}
