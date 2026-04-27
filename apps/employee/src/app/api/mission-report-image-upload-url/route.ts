import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  MAX_IMAGE_BYTES,
  buildDraftImageKey,
  createMissionReportImageUploadUrl,
  isAllowedImageContentType,
  type AllowedImageContentType,
} from "@correcre/lib/s3/mission-report-image";

import { getEmployeeSession } from "@employee/lib/auth/session";
import { getEmployeeUserForSession } from "@employee/lib/auth/current-user";

const EXTENSION_BY_CONTENT_TYPE: Record<AllowedImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

type RequestBody = {
  contentType?: unknown;
  contentLength?: unknown;
  originalFileName?: unknown;
};

export async function POST(req: Request) {
  const session = await getEmployeeSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await getEmployeeUserForSession(session);

  if (!user) {
    return NextResponse.json({ error: "employee_only" }, { status: 403 });
  }

  let body: RequestBody;

  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const contentLength = typeof body.contentLength === "number" ? body.contentLength : NaN;
  const originalFileName = typeof body.originalFileName === "string" ? body.originalFileName.trim() : "";

  if (!isAllowedImageContentType(contentType)) {
    return NextResponse.json(
      { error: "unsupported_content_type", allowed: ALLOWED_IMAGE_CONTENT_TYPES },
      { status: 400 },
    );
  }

  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return NextResponse.json({ error: "invalid_content_length" }, { status: 400 });
  }

  if (contentLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "file_too_large", maxBytes: MAX_IMAGE_BYTES }, { status: 400 });
  }

  if (!originalFileName) {
    return NextResponse.json({ error: "original_file_name_required" }, { status: 400 });
  }

  try {
    const region = readRequiredServerEnv("AWS_REGION");
    const bucketName = readRequiredServerEnv("S3_MISSION_REPORT_IMAGE_BUCKET_NAME");

    const uploadId = randomUUID();
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
    const s3Key = buildDraftImageKey({
      companyId: user.companyId,
      userId: user.userId,
      uploadId,
      extension,
    });

    const { url, expiresAt } = await createMissionReportImageUploadUrl(
      { region, bucketName },
      {
        s3Key,
        contentType,
        contentLength,
      },
    );

    return NextResponse.json({
      uploadUrl: url,
      expiresAt,
      s3Key,
      contentType,
      originalFileName,
      size: contentLength,
    });
  } catch (error) {
    console.error("POST /api/mission-report-image-upload-url error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
