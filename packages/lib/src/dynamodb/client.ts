import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

import { getResolvedAwsProfile, getResolvedAwsRoleArn } from "../aws/credentials";

const clientCache = new Map<string, DynamoDBDocumentClient>();

// ローカル開発・統合テストで DynamoDB Local などのエンドポイントへ向けるための上書き。
// 設定されている場合は認証情報の解決（プロファイル / Vercel OIDC）を行わず、ダミーの静的キーを使う。
// DynamoDB Local は認証情報の中身を検証しないが、SDK の署名処理には何らかの値が必要なため。
function getLocalEndpointOverride() {
  const endpoint = process.env.DDB_ENDPOINT?.trim();
  return endpoint ? endpoint : undefined;
}

export function getDynamoDocumentClient(region: string) {
  const normalizedRegion = region.trim();
  const localEndpoint = getLocalEndpointOverride();
  const profile = localEndpoint ? undefined : getResolvedAwsProfile();
  const roleArn = localEndpoint ? undefined : getResolvedAwsRoleArn();
  const cacheKey = `${normalizedRegion}:${
    localEndpoint ? `endpoint:${localEndpoint}` : roleArn ? `oidc:${roleArn}` : (profile ?? "default")
  }`;
  const cachedClient = clientCache.get(cacheKey);

  if (cachedClient) {
    return cachedClient;
  }

  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: normalizedRegion,
      ...(localEndpoint
        ? {
            endpoint: localEndpoint,
            credentials: {
              accessKeyId: "local",
              secretAccessKey: "local",
            },
          }
        : {}),
      ...(roleArn
        ? {
            credentials: awsCredentialsProvider({
              roleArn,
              clientConfig: {
                region: normalizedRegion,
              },
            }),
          }
        : profile
          ? {
              credentials: fromIni({
                profile,
              }),
            }
          : {}),
    }),
    {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    },
  );

  clientCache.set(cacheKey, client);
  return client;
}
