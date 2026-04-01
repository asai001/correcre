import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { getResolvedAwsProfile } from "../aws/credentials";

const clientCache = new Map<string, DynamoDBDocumentClient>();

export function getDynamoDocumentClient(region: string) {
  const normalizedRegion = region.trim();
  const profile = getResolvedAwsProfile();
  const cacheKey = `${normalizedRegion}:${profile ?? "default"}`;
  const cachedClient = clientCache.get(cacheKey);

  if (cachedClient) {
    return cachedClient;
  }

  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: normalizedRegion,
      ...(profile
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
