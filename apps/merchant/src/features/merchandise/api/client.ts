import type { ProductFulfillment } from "@correcre/types";

import type {
  CreateMerchandiseRequest,
  MerchandiseSummary,
  RequestUploadUrlResponse,
  SchedulePreviewResponse,
  UpdateMerchandiseRequest,
  UpdateMerchandiseStatusRequest,
} from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

// ネットワーク断や S3 バケットの CORS 許可漏れで通信自体が成立しなかった場合、
// fetch は TypeError("Failed to fetch") を投げる。そのまま画面に出すと利用者には
// 何が起きたのか分からないため、日本語の案内メッセージに置き換える。
async function fetchOrThrowNetworkError(
  input: string,
  init: RequestInit,
  networkErrorMessage: string,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    console.error("network request failed", { input, error });
    throw new Error(networkErrorMessage);
  }
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

export async function deleteMerchandise(merchandiseId: string): Promise<void> {
  const res = await fetch(`/api/merchandise/${encodeURIComponent(merchandiseId)}`, {
    method: "DELETE",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "商品の削除に失敗しました。"));
  }
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
  const res = await fetchOrThrowNetworkError(
    "/api/merchandise/upload-url",
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, contentLength }),
    },
    "画像アップロードの準備に失敗しました。通信環境をご確認のうえ、時間をおいて再度お試しください。",
  );

  if (!res.ok) {
    throw new Error(await parseError(res, "画像アップロード URL の発行に失敗しました。"));
  }

  return (await res.json()) as RequestUploadUrlResponse;
}

export async function uploadMerchandiseImage(uploadUrl: string, file: File): Promise<void> {
  // 画像は署名付き URL でブラウザから S3 へ直接 PUT する。バケットの CORS 許可オリジンと
  // アプリのドメインがずれていると、プリフライトで弾かれてここが通信エラーになる。
  const res = await fetchOrThrowNetworkError(
    uploadUrl,
    {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    },
    "画像のアップロードに失敗しました。通信環境をご確認のうえ、時間をおいて再度お試しください。解消しない場合はサポートまでお問い合わせください。",
  );

  if (!res.ok) {
    console.error("merchandise image upload rejected by S3", { status: res.status });

    // 署名付き URL の有効期限は 5 分。期限切れは 403 で返るため、選び直しを案内する。
    throw new Error(
      res.status === 403
        ? "画像のアップロード可能な時間を過ぎました。お手数ですが、もう一度画像を選択してください。"
        : "画像のアップロードに失敗しました。時間をおいて再度お試しください。",
    );
  }
}

// 入力中の配送設定で、実際にどのお届け日が提示されるかを確認する。
// 日付の計算はサーバー側でのみ行い、画面は返ってきた文字列を表示するだけにする。
export async function fetchSchedulePreview(
  fulfillment: ProductFulfillment,
  signal?: AbortSignal,
): Promise<SchedulePreviewResponse> {
  const res = await fetch("/api/merchandise/schedule-preview", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fulfillment }),
    signal,
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "お届け日の確認に失敗しました。"));
  }

  return (await res.json()) as SchedulePreviewResponse;
}
