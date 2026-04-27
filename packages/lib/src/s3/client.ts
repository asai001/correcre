import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

import { getResolvedAwsProfile, getResolvedAwsRoleArn } from "../aws/credentials";

const clientCache = new Map<string, S3Client>();

export function getS3Client(region: string): S3Client {
  const normalizedRegion = region.trim();
  const profile = getResolvedAwsProfile();
  const roleArn = getResolvedAwsRoleArn();
  const cacheKey = `${normalizedRegion}:${roleArn ? `oidc:${roleArn}` : profile ?? "default"}`;
  const cachedClient = clientCache.get(cacheKey);

  if (cachedClient) {
    return cachedClient;
  }

  const client = new S3Client({
    region: normalizedRegion,
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
  });

  clientCache.set(cacheKey, client);
  return client;
}
