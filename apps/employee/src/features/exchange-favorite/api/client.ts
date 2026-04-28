import type { CreateSavedFilterRequest, FavoritesResponse, SavedFilter } from "../model/types";

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function fetchExchangeFavorites(): Promise<FavoritesResponse> {
  const res = await fetch("/api/exchange/favorites", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await parseError(res, "お気に入り情報の取得に失敗しました。"));
  }
  return (await res.json()) as FavoritesResponse;
}

export async function addExchangeFavorite(merchantId: string, merchandiseId: string): Promise<void> {
  const res = await fetch("/api/exchange/favorites", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantId, merchandiseId }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "お気に入りの登録に失敗しました。"));
  }
}

export async function removeExchangeFavorite(merchantId: string, merchandiseId: string): Promise<void> {
  const params = new URLSearchParams({ merchantId, merchandiseId });
  const res = await fetch(`/api/exchange/favorites?${params.toString()}`, {
    method: "DELETE",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "お気に入りの削除に失敗しました。"));
  }
}

export async function createSavedFilter(input: CreateSavedFilterRequest): Promise<SavedFilter> {
  const res = await fetch("/api/exchange/saved-filters", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "条件の保存に失敗しました。"));
  }
  return (await res.json()) as SavedFilter;
}

export async function deleteSavedFilter(filterId: string): Promise<void> {
  const res = await fetch(`/api/exchange/saved-filters/${encodeURIComponent(filterId)}`, {
    method: "DELETE",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "保存条件の削除に失敗しました。"));
  }
}
