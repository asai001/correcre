import "server-only";

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

import { getResolvedAwsProfile, getResolvedAwsRoleArn } from "../aws/credentials";

export type SesEmailConfig = {
  region: string;
  fromEmail: string;
};

export type SendSesEmailInput = {
  to: string | readonly string[];
  subject: string;
  text: string;
};

const clientCache = new Map<string, SESv2Client>();

function getSesClient(region: string) {
  const normalizedRegion = region.trim();
  const profile = getResolvedAwsProfile();
  const roleArn = getResolvedAwsRoleArn();
  const cacheKey = `${normalizedRegion}:${roleArn ? `oidc:${roleArn}` : profile ?? "default"}`;
  const cachedClient = clientCache.get(cacheKey);

  if (cachedClient) {
    return cachedClient;
  }

  const client = new SESv2Client({
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

function normalizeRecipients(value: string | readonly string[]) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

export async function sendSesEmail(config: SesEmailConfig, input: SendSesEmailInput): Promise<void> {
  const toAddresses = normalizeRecipients(input.to);

  if (!toAddresses.length) {
    throw new Error("At least one recipient is required.");
  }

  const fromEmailAddress = config.fromEmail.trim();

  if (!fromEmailAddress) {
    throw new Error("SES from email is required.");
  }

  await getSesClient(config.region).send(
    new SendEmailCommand({
      FromEmailAddress: fromEmailAddress,
      Destination: {
        ToAddresses: toAddresses,
      },
      Content: {
        Simple: {
          Subject: {
            Data: input.subject,
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: input.text,
              Charset: "UTF-8",
            },
          },
        },
      },
    }),
  );
}
