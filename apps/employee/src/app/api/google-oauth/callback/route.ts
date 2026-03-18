import { exchangeGoogleAuthorizationCode, getGoogleOAuthConfig, resolveGoogleOAuthRedirectUri } from "@employee/app/lib/google-oauth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

function renderHtml(title: string, body: string): Response {
  return new Response(
    `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: sans-serif; margin: 40px; line-height: 1.6; color: #0f172a; }
      main { max-width: 900px; }
      pre { white-space: pre-wrap; word-break: break-all; padding: 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    </style>
  </head>
  <body>
    <main>
      ${body}
    </main>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}

export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return renderHtml("Google OAuth Error", `<h1>Google OAuth Error</h1><p><code>${error}</code></p>`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (!code) {
    return renderHtml("Missing Code", "<h1>code がありません</h1>");
  }

  if (!state || !stateCookie || state !== stateCookie) {
    return renderHtml("Invalid State", "<h1>state が一致しません</h1><p>認可をやり直してください。</p>");
  }

  try {
    const config = getGoogleOAuthConfig({ requireRefreshToken: false });
    const redirectUri = resolveGoogleOAuthRedirectUri(config, req.url);
    const token = await exchangeGoogleAuthorizationCode(config, code, redirectUri);

    if (!token.refresh_token) {
      return renderHtml(
        "Refresh Token Missing",
        "<h1>refresh_token が返ってきませんでした</h1><p>Google 側で既に承認済みの可能性があります。対象アプリのアクセス権を一度削除してから、再度 <code>/api/google-oauth/authorize</code> を開いてください。</p>",
      );
    }

    return renderHtml(
      "Refresh Token",
      `<h1>refresh token を取得しました</h1>
<p>以下の1行をそのまま <code>apps/employee/.env.local</code> に追加して、開発サーバーを再起動してください。</p>
<p>既存の <code>GOOGLE_OAUTH_REFRESH_TOKEN=</code> の右側に、さらに <code>GOOGLE_OAUTH_REFRESH_TOKEN=</code> を重ねて貼らないでください。</p>
<pre>GOOGLE_OAUTH_REFRESH_TOKEN=${token.refresh_token}</pre>`,
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "internal_error";

    return renderHtml("Google OAuth Error", `<h1>Google OAuth Error</h1><pre>${message}</pre>`);
  }
}
