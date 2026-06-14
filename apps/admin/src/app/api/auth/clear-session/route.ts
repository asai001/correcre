import { type NextRequest, NextResponse } from "next/server";

import { ADMIN_DEFAULT_REDIRECT_PATH, ADMIN_LOGIN_PATH } from "@admin/lib/auth/constants";
import { sanitizeRedirectTo } from "@admin/lib/auth/redirect";
import { clearAdminSession } from "@admin/lib/auth/session";

function buildLoginUrl(request: NextRequest) {
  const redirectTo = sanitizeRedirectTo(request.nextUrl.searchParams.get("from"));
  const loginUrl = request.nextUrl.clone();

  loginUrl.pathname = ADMIN_LOGIN_PATH;
  loginUrl.search = "";

  if (redirectTo !== ADMIN_DEFAULT_REDIRECT_PATH) {
    loginUrl.searchParams.set("from", redirectTo);
  }

  return loginUrl;
}

export async function GET(request: NextRequest) {
  await clearAdminSession();
  return NextResponse.redirect(buildLoginUrl(request));
}
