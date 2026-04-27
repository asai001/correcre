import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

import type { InfraStage } from "./infra-stack";

export interface ApplicationS3BucketsProps {
  stage: InfraStage;
  adminAppUrl: string;
  employeeAppUrl: string;
  operatorAppUrl?: string;
  merchantAppUrl?: string;
}

export interface ApplicationS3Buckets {
  missionReportImageBucket: s3.Bucket;
  merchandiseImageBucket: s3.Bucket;
}

function isProductionStage(stage: InfraStage): boolean {
  return stage === "prod";
}

function resolveRemovalPolicy(stage: InfraStage): cdk.RemovalPolicy {
  return isProductionStage(stage) ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
}

function buildBucketName(baseName: string, stage: InfraStage, account?: string): string {
  // 環境間で重複しないように account を含める
  const accountSuffix = account ? `-${account}` : "";
  return `correcre-${baseName}-${stage}${accountSuffix}`;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildAllowedOrigins(props: ApplicationS3BucketsProps): string[] {
  const origins = [props.adminAppUrl, props.employeeAppUrl];

  if (props.operatorAppUrl) {
    origins.push(props.operatorAppUrl);
  }

  if (props.merchantAppUrl) {
    origins.push(props.merchantAppUrl);
  }

  if (!isProductionStage(props.stage)) {
    origins.push(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
    );
  }

  return origins.map(trimTrailingSlash);
}

// MissionReportImageBucket
// - 用途: ミッション報告フォームの image フィールドにアップロードされる画像の保管
// - キー設計: mission-reports/<companyId>/<userId>/<reportId>/<uuid>.<ext>
//   下書き(submit前): drafts/<companyId>/<userId>/<uploadId>.<ext>
// - アクセス: BlockPublicAccess は完全有効。閲覧/アップロードは presigned URL のみ
export function createApplicationS3Buckets(
  scope: Construct,
  props: ApplicationS3BucketsProps,
): ApplicationS3Buckets {
  const stack = cdk.Stack.of(scope);
  const allowedOrigins = buildAllowedOrigins(props);

  const missionReportImageBucket = new s3.Bucket(scope, "MissionReportImageBucket", {
    bucketName: buildBucketName("mission-report-image", props.stage, stack.account),
    encryption: s3.BucketEncryption.S3_MANAGED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    enforceSSL: true,
    versioned: false,
    removalPolicy: resolveRemovalPolicy(props.stage),
    autoDeleteObjects: !isProductionStage(props.stage),
    cors: [
      {
        allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
        allowedOrigins,
        allowedHeaders: ["*"],
        exposedHeaders: ["ETag"],
        maxAge: 3000,
      },
    ],
    lifecycleRules: [
      {
        id: "expire-drafts-after-7-days",
        prefix: "drafts/",
        expiration: cdk.Duration.days(7),
        enabled: true,
      },
      {
        id: "abort-incomplete-multipart-after-1-day",
        abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        enabled: true,
      },
    ],
  });

  // MerchandiseImageBucket
  // - 用途: 提携企業が登録する商品の一覧カード用画像と詳細ページ用画像
  // - キー設計: merchandise/<merchantId>/<merchandiseId>/<uuid>.<ext>
  //   下書き(submit前): drafts/<merchantId>/<uploadId>.<ext>
  // - アクセス: BlockPublicAccess は完全有効。閲覧/アップロードは presigned URL のみ
  const merchandiseImageBucket = new s3.Bucket(scope, "MerchandiseImageBucket", {
    bucketName: buildBucketName("merchandise-image", props.stage, stack.account),
    encryption: s3.BucketEncryption.S3_MANAGED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    enforceSSL: true,
    versioned: false,
    removalPolicy: resolveRemovalPolicy(props.stage),
    autoDeleteObjects: !isProductionStage(props.stage),
    cors: [
      {
        allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
        allowedOrigins,
        allowedHeaders: ["*"],
        exposedHeaders: ["ETag"],
        maxAge: 3000,
      },
    ],
    lifecycleRules: [
      {
        id: "expire-drafts-after-7-days",
        prefix: "drafts/",
        expiration: cdk.Duration.days(7),
        enabled: true,
      },
      {
        id: "abort-incomplete-multipart-after-1-day",
        abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        enabled: true,
      },
    ],
  });

  return { missionReportImageBucket, merchandiseImageBucket };
}
