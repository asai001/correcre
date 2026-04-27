import "server-only";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getS3Client } from "./client";

export type MissionReportImageS3Config = {
  region: string;
  bucketName: string;
};

const PUT_URL_EXPIRES_IN_SECONDS = 60 * 5; // 5 分: アップロード開始までの猶予
const GET_URL_EXPIRES_IN_SECONDS = 60 * 10; // 10 分: モーダル表示中の閲覧

export const ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export type AllowedImageContentType = (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number];

export function isAllowedImageContentType(contentType: string): contentType is AllowedImageContentType {
  return (ALLOWED_IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType);
}

export function buildDraftImageKey(params: {
  companyId: string;
  userId: string;
  uploadId: string;
  extension: string;
}): string {
  const ext = params.extension.replace(/^\./, "").toLowerCase();
  return `drafts/${params.companyId}/${params.userId}/${params.uploadId}.${ext}`;
}

export function isDraftImageKey(s3Key: string): boolean {
  return s3Key.startsWith("drafts/");
}

// 報告内のいずれかのフィールドに紐づく画像であることを担保するため
// `mission-reports/<companyId>/<userId>/...` プレフィックスにのみ閲覧を許可
export function isMissionReportImageKey(s3Key: string, companyId: string, userId?: string): boolean {
  if (s3Key.startsWith(`mission-reports/${companyId}/`)) {
    if (!userId) {
      return true;
    }
    return s3Key.startsWith(`mission-reports/${companyId}/${userId}/`);
  }
  if (s3Key.startsWith(`drafts/${companyId}/`)) {
    if (!userId) {
      return true;
    }
    return s3Key.startsWith(`drafts/${companyId}/${userId}/`);
  }
  return false;
}

export async function createMissionReportImageUploadUrl(
  config: MissionReportImageS3Config,
  params: {
    s3Key: string;
    contentType: AllowedImageContentType;
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

export async function createMissionReportImageViewUrl(
  config: MissionReportImageS3Config,
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
