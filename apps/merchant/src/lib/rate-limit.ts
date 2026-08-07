const buckets = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 5000;

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

/**
 * インメモリのスライディングウィンドウ。サーバーレスではインスタンスごとの状態なので
 * 完全な制限にはならないが、公開エンドポイントへの単純な連投を止める程度の効果はある。
 */
export function consumeRateLimit(key: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  const threshold = now - options.windowMs;
  const hits = (buckets.get(key) ?? []).filter((hitAt) => hitAt > threshold);

  if (hits.length >= options.limit) {
    buckets.set(key, hits);
    return false;
  }

  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [trackedKey, trackedHits] of buckets) {
      if (!trackedHits.some((hitAt) => hitAt > threshold)) {
        buckets.delete(trackedKey);
      }
    }

    // 期限切れを消しても上限を超えるなら、メモリを守るため丸ごと捨てる（制限は次のウィンドウから）。
    if (buckets.size > MAX_TRACKED_KEYS) {
      buckets.clear();
    }
  }

  return true;
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
