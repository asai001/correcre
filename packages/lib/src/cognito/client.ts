import "server-only";

import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

import { getResolvedAwsProfile, getResolvedAwsRoleArn } from "../aws/credentials";

const clientCache = new Map<string, CognitoIdentityProviderClient>();

export function getCognitoIdentityProviderClient(region: string) {
  const normalizedRegion = region.trim();
  const profile = getResolvedAwsProfile();
  const roleArn = getResolvedAwsRoleArn();
  const cacheKey = `${normalizedRegion}:${roleArn ? `oidc:${roleArn}` : profile ?? "default"}`;
  const cachedClient = clientCache.get(cacheKey);

  if (cachedClient) {
    return cachedClient;
  }

  const client = new CognitoIdentityProviderClient({
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
