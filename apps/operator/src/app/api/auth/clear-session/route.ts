import { type NextRequest, NextResponse } from "next/server";

import { OPERATOR_DEFAULT_REDIRECT_PATH, OPERATOR_LOGIN_PATH } from "@operator/lib/auth/constants";
import { sanitizeRedirectTo } from "@operator/lib/auth/redirect";
import { clearOperatorSession } from "@operator/lib/auth/session";

function buildLoginUrl(request: NextRequest) {
  const redirectTo = sanitizeRedirectTo(request.nextUrl.searchParams.get("from"));
  const loginUrl = request.nextUrl.clone();

  loginUrl.pathname = OPERATOR_LOGIN_PATH;
  loginUrl.search = "";

  if (redirectTo !== OPERATOR_DEFAULT_REDIRECT_PATH) {
    loginUrl.searchParams.set("from", redirectTo);
  }

  return loginUrl;
}

export async function GET(request: NextRequest) {
  await clearOperatorSession();
  return NextResponse.redirect(buildLoginUrl(request));
}
