import { type NextRequest, NextResponse } from "next/server";

import { EMPLOYEE_DEFAULT_REDIRECT_PATH, EMPLOYEE_LOGIN_PATH } from "@employee/lib/auth/constants";
import { sanitizeRedirectTo } from "@employee/lib/auth/redirect";
import { clearEmployeeSession } from "@employee/lib/auth/session";

function buildLoginUrl(request: NextRequest) {
  const redirectTo = sanitizeRedirectTo(request.nextUrl.searchParams.get("from"));
  const loginUrl = request.nextUrl.clone();

  loginUrl.pathname = EMPLOYEE_LOGIN_PATH;
  loginUrl.search = "";

  if (redirectTo !== EMPLOYEE_DEFAULT_REDIRECT_PATH) {
    loginUrl.searchParams.set("from", redirectTo);
  }

  return loginUrl;
}

export async function GET(request: NextRequest) {
  await clearEmployeeSession();
  return NextResponse.redirect(buildLoginUrl(request));
}
