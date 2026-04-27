import { NextResponse } from "next/server";

import { readRequiredServerEnv } from "@correcre/lib/env/server";
import {
  createMissionReportImageViewUrl,
  isMissionReportImageKey,
} from "@correcre/lib/s3/mission-report-image";

import { getAdminUserForSession } from "@admin/lib/auth/current-user";
import { getAdminSession } from "@admin/lib/auth/session";

export async function GET(req: Request) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adminUser = await getAdminUserForSession(session);

  if (!adminUser) {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const s3Key = searchParams.get("s3Key");

  if (!s3Key) {
    return NextResponse.json({ error: "s3Key_required" }, { status: 400 });
  }

  // 自社の報告に紐づく画像でなければ閲覧URLを発行しない
  if (!isMissionReportImageKey(s3Key, adminUser.companyId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const region = readRequiredServerEnv("AWS_REGION");
    const bucketName = readRequiredServerEnv("S3_MISSION_REPORT_IMAGE_BUCKET_NAME");

    const { url, expiresAt } = await createMissionReportImageViewUrl({ region, bucketName }, s3Key);

    return NextResponse.json({ url, expiresAt });
  } catch (error) {
    console.error("GET /api/mission-report-image-view-url error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
