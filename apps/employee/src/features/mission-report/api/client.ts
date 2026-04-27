import type { Mission, MissionReport, FormConfig, ImageFieldValue } from "../model/types";

// 将来 DynamoDB/API に置換する関数群（今はモック返却）

export type UploadMissionImageResult = ImageFieldValue;

type UploadUrlResponse = {
  uploadUrl: string;
  expiresAt: string;
  s3Key: string;
  contentType: string;
  originalFileName: string;
  size: number;
};

export async function uploadMissionReportImage(file: File): Promise<UploadMissionImageResult> {
  const issueRes = await fetch("/api/mission-report-image-upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contentType: file.type,
      contentLength: file.size,
      originalFileName: file.name,
    }),
  });

  if (!issueRes.ok) {
    const errorBody = await issueRes.text();
    throw new Error(`failed to issue upload url: ${issueRes.status} ${errorBody}`);
  }

  const issued = (await issueRes.json()) as UploadUrlResponse;

  const putRes = await fetch(issued.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!putRes.ok) {
    const errorBody = await putRes.text();
    throw new Error(`failed to upload to S3: ${putRes.status} ${errorBody}`);
  }

  return {
    s3Key: issued.s3Key,
    contentType: issued.contentType,
    originalFileName: issued.originalFileName,
    size: issued.size,
    uploadedAt: new Date().toISOString(),
  };
}

export async function fetchMission(
  companyId: string,
  userId: string
): Promise<{ mission: Mission[]; missionReports: MissionReport[] } | null> {
  const params = new URLSearchParams({ companyId, userId }).toString();

  const res = await fetch(`/api/mission?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    // ここで 404/500 を見て適宜ハンドリング
    console.error("fetchMission error", res.status, await res.text());
    throw new Error("ダッシュボード情報の取得に失敗しました");
  }

  const data = (await res.json()) as { mission: Mission[]; missionReports: MissionReport[] } | null;

  return data;
}

export async function fetchMissionFormConfig(companyId: string, missionId: string): Promise<FormConfig | null> {
  const params = new URLSearchParams({ companyId, missionId }).toString();

  const res = await fetch(`/api/mission-form-config?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("fetchMissionFormConfig error", res.status, await res.text());
    // フォームが未設定など 404/500 の場合は null を返し、画面側で「未設定」と表示する
    return null;
  }

  const data = (await res.json()) as FormConfig | null;
  return data;
}
