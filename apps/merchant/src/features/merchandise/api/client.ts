import type {
  CreateMerchandiseRequest,
  MerchandiseSummary,
  RequestUploadUrlResponse,
  UpdateMerchandiseRequest,
  UpdateMerchandiseStatusRequest,
} from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function fetchMerchandise(): Promise<MerchandiseSummary[]> {
  const res = await fetch("/api/merchandise", { cache: "no-store" });

  if (!res.ok) {
    throw new Error(await parseError(res, "商品一覧の取得に失敗しました。"));
  }

  return (await res.json()) as MerchandiseSummary[];
}

export async function createMerchandise(input: CreateMerchandiseRequest): Promise<MerchandiseSummary> {
  const res = await fetch("/api/merchandise", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "商品の登録に失敗しました。"));
  }

  return (await res.json()) as MerchandiseSummary;
}

export async function updateMerchandise(
  merchandiseId: string,
  input: UpdateMerchandiseRequest,
): Promise<MerchandiseSummary> {
  const res = await fetch(`/api/merchandise/${encodeURIComponent(merchandiseId)}`, {
    method: "PATCH",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "商品の更新に失敗しました。"));
  }

  return (await res.json()) as MerchandiseSummary;
}

export async function updateMerchandiseStatus(
  merchandiseId: string,
  input: UpdateMerchandiseStatusRequest,
): Promise<MerchandiseSummary> {
  const res = await fetch(`/api/merchandise/${encodeURIComponent(merchandiseId)}/status`, {
    method: "PATCH",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "公開状態の更新に失敗しました。"));
  }

  return (await res.json()) as MerchandiseSummary;
}

export async function requestMerchandiseUploadUrl(
  contentType: string,
  contentLength: number,
): Promise<RequestUploadUrlResponse> {
  const res = await fetch("/api/merchandise/upload-url", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType, contentLength }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "画像アップロード URL の発行に失敗しました。"));
  }

  return (await res.json()) as RequestUploadUrlResponse;
}

export async function uploadMerchandiseImage(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!res.ok) {
    throw new Error("画像のアップロードに失敗しました。");
  }
}
