#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";

import { InfraStack, type InfraStage } from "../lib/infra-stack";

type EnvironmentConfig = {
  stage: InfraStage;
  account: string;
  region: string;
  adminUrl: string;
  employeeUrl: string;
  sourceContext: string;
};

const environments: EnvironmentConfig[] = [
  {
    stage: "dev",
    account: "134606630920",
    region: "ap-northeast-1",
    adminUrl: "https://dev.correcre-admin.vercel.app/",
    employeeUrl: "https://dev.correcre-employee.vercel.app/",
    sourceContext: "local",
  },
  {
    stage: "stg",
    account: "622550700840",
    region: "ap-northeast-1",
    adminUrl: "https://stg.correcre-admin.vercel.app/",
    employeeUrl: "https://stg.correcre-employee.vercel.app/",
    sourceContext: "stage",
  },
  {
    stage: "prod",
    account: "923520716541",
    region: "ap-northeast-1",
    adminUrl: "https://correcre-admin.vercel.app/",
    employeeUrl: "https://correcre-employee.vercel.app/",
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
    sourceContext: environment.sourceContext,
    description: `Correcre ${environment.stage} infrastructure stack`,
  });

  cdk.Tags.of(stack).add("Project", "correcre");
  cdk.Tags.of(stack).add("Environment", environment.stage);
  cdk.Tags.of(stack).add("SourceContext", environment.sourceContext);
}
