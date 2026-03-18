import { randomUUID } from "node:crypto";
import { buildGoogleOAuthAuthorizationUrl, getGoogleOAuthConfig, resolveGoogleOAuthRedirectUri } from "@employee/app/lib/google-oauth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

export async function GET(req: NextRequest) {
  try {
    const config = getGoogleOAuthConfig({ requireRefreshToken: false });
    const redirectUri = resolveGoogleOAuthRedirectUri(config, req.url);
    const state = randomUUID();
    const authorizationUrl = buildGoogleOAuthAuthorizationUrl(config, redirectUri, state);
    const response = NextResponse.redirect(authorizationUrl);

    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
