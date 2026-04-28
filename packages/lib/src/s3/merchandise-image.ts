import "server-only";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getS3Client } from "./client";

export type MerchandiseImageS3Config = {
  region: string;
  bucketName: string;
};

export type MerchandiseImageTarget = "card" | "detail";

const PUT_URL_EXPIRES_IN_SECONDS = 60 * 5;
const GET_URL_EXPIRES_IN_SECONDS = 60 * 10;

export const MERCHANDISE_ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MERCHANDISE_MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type MerchandiseAllowedImageContentType = (typeof MERCHANDISE_ALLOWED_IMAGE_CONTENT_TYPES)[number];

export function isMerchandiseAllowedImageContentType(
  contentType: string,
): contentType is MerchandiseAllowedImageContentType {
  return (MERCHANDISE_ALLOWED_IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType);
}

export function buildMerchandiseDraftImageKey(params: {
  merchantId: string;
  uploadId: string;
  extension: string;
}): string {
  const ext = params.extension.replace(/^\./, "").toLowerCase();
  return `drafts/${params.merchantId}/${params.uploadId}.${ext}`;
}

export function buildMerchandiseFinalImageKey(params: {
  merchantId: string;
  merchandiseId: string;
  target: MerchandiseImageTarget;
  extension: string;
}): string {
  const ext = params.extension.replace(/^\./, "").toLowerCase();
  return `merchandise/${params.merchantId}/${params.merchandiseId}/${params.target}.${ext}`;
}

export function isMerchandiseDraftImageKey(s3Key: string): boolean {
  return s3Key.startsWith("drafts/");
}

export function getExtensionFromKey(s3Key: string): string {
  const lastDot = s3Key.lastIndexOf(".");
  return lastDot >= 0 ? s3Key.slice(lastDot + 1) : "";
}

export function isMerchandiseImageKeyForMerchant(s3Key: string, merchantId: string): boolean {
  return (
    s3Key.startsWith(`merchandise/${merchantId}/`) || s3Key.startsWith(`drafts/${merchantId}/`)
  );
}

export async function promoteMerchandiseDraftImage(
  config: MerchandiseImageS3Config,
  params: { sourceKey: string; destinationKey: string },
): Promise<void> {
  const client = getS3Client(config.region);

  await client.send(
    new CopyObjectCommand({
      Bucket: config.bucketName,
      Key: params.destinationKey,
      CopySource: `${config.bucketName}/${encodeURIComponent(params.sourceKey)}`,
      MetadataDirective: "COPY",
    }),
  );

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: params.sourceKey,
      }),
    );
  } catch (error) {
    console.warn("failed to delete draft merchandise image after promotion", {
      sourceKey: params.sourceKey,
      error,
    });
  }
}

export async function createMerchandiseImageUploadUrl(
  config: MerchandiseImageS3Config,
  params: {
    s3Key: string;
    contentType: MerchandiseAllowedImageContentType;
    contentLength: number;
  },
): Promise<{ url: string; expiresAt: string }> {
  const client = getS3Client(config.region);
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: params.s3Key,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  });

  const url = await getSignedUrl(client, command, { expiresIn: PUT_URL_EXPIRES_IN_SECONDS });

  return {
    url,
    expiresAt: new Date(Date.now() + PUT_URL_EXPIRES_IN_SECONDS * 1000).toISOString(),
  };
}

export async function createMerchandiseImageViewUrl(
  config: MerchandiseImageS3Config,
  s3Key: string,
): Promise<{ url: string; expiresAt: string }> {
  const client = getS3Client(config.region);
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: s3Key,
  });

  const url = await getSignedUrl(client, command, { expiresIn: GET_URL_EXPIRES_IN_SECONDS });

  return {
    url,
    expiresAt: new Date(Date.now() + GET_URL_EXPIRES_IN_SECONDS * 1000).toISOString(),
  };
}
