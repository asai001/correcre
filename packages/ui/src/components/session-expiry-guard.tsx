"use client";

import { useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

const REDIRECT_DELAY_MS = 3000;

// 401（未認証）に加え、ロール不一致やセッションに紐づくユーザーが解決できない
// ことを示す 403 のときだけ「セッション切れ」として扱う。
// company_mismatch / image_key_forbidden / forbidden のような業務上の 403 では発火させない。
const SESSION_FAILURE_ERROR_CODES = new Set([
  "unauthorized",
  "operator_only",
  "admin_only",
  "employee_only",
  "merchant_only",
  "employee_not_found",
]);

let interceptorInstalled = false;
let redirectScheduled = false;
const subscribers = new Set<() => void>();

function resolveRequestUrl(input: RequestInfo | URL): URL | null {
  try {
    if (typeof input === "string") {
      return new URL(input, window.location.origin);
    }
    if (input instanceof URL) {
      return input;
    }
    if (input instanceof Request) {
      return new URL(input.url, window.location.origin);
    }
  } catch {
    return null;
  }
  return null;
}

// 自分のオリジン宛の /api 呼び出しだけを対象にする。
// S3 presigned URL への直 PUT（別オリジン）などは無視する。
function isSameOriginApiRequest(input: RequestInfo | URL): boolean {
  const url = resolveRequestUrl(input);
  if (!url) {
    return false;
  }
  return url.origin === window.location.origin && url.pathname.startsWith("/api");
}

function scheduleSessionExpiredRedirect(loginPath: string) {
  if (redirectScheduled) {
    return;
  }
  if (window.location.pathname.startsWith(loginPath)) {
    return;
  }
  redirectScheduled = true;

  subscribers.forEach((notify) => notify());

  const from = `${window.location.pathname}${window.location.search}`;
  const target = from && from !== "/" ? `${loginPath}?from=${encodeURIComponent(from)}` : loginPath;

  window.setTimeout(() => {
    window.location.assign(target);
  }, REDIRECT_DELAY_MS);
}

async function shouldTreatAsSessionFailure(response: Response): Promise<boolean> {
  if (response.status === 401) {
    return true;
  }
  if (response.status !== 403) {
    return false;
  }

  try {
    const data = (await response.clone().json()) as { error?: string } | null;
    return data?.error ? SESSION_FAILURE_ERROR_CODES.has(data.error) : false;
  } catch {
    return false;
  }
}

function installFetchInterceptor(loginPath: string) {
  if (interceptorInstalled || typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);

    if ((response.status === 401 || response.status === 403) && isSameOriginApiRequest(input)) {
      // 本文確認は呼び出し元へ Response を返したあとに非同期で行う（応答をブロックしない）。
      void shouldTreatAsSessionFailure(response).then((isFailure) => {
        if (isFailure) {
          scheduleSessionExpiredRedirect(loginPath);
        }
      });
    }

    return response;
  };
}

type SessionExpiryGuardProps = {
  /** 期限切れ時のリダイレクト先。全アプリで `/login`。 */
  loginPath?: string;
};

/**
 * クライアントからの同一オリジン `/api` 呼び出しが 401／認証系 403 を返したら、
 * 「セッションが切れました」トーストを 3 秒表示してからログイン画面へ遷移させる。
 * 各アプリのルートレイアウト（Providers 配下）に 1 つだけ設置する。
 */
export function SessionExpiryGuard({ loginPath = "/login" }: SessionExpiryGuardProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    installFetchInterceptor(loginPath);

    const notify = () => setOpen(true);
    subscribers.add(notify);

    return () => {
      subscribers.delete(notify);
    };
  }, [loginPath]);

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      autoHideDuration={REDIRECT_DELAY_MS}
    >
      <Alert severity="warning" variant="filled" sx={{ width: "100%" }}>
        セッションが切れました。ログイン画面に戻ります。
      </Alert>
    </Snackbar>
  );
}

export default SessionExpiryGuard;
