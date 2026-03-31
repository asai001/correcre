import { NextRequest, NextResponse } from "next/server";

import {
  EMPLOYEE_DEFAULT_REDIRECT_PATH,
  EMPLOYEE_LOGIN_PATH,
  EMPLOYEE_PROTECTED_PATH_PREFIXES,
  EMPLOYEE_SESSION_COOKIE_NAME,
} from "@employee/lib/auth/constants";
import { sanitizeRedirectTo } from "@employee/lib/auth/redirect";
import { verifyEmployeeIdToken } from "@employee/lib/auth/verify-token";

function isProtectedPath(pathname: string) {
  return EMPLOYEE_PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildLoginRedirect(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectTo = sanitizeRedirectTo(requestedPath);

  loginUrl.pathname = EMPLOYEE_LOGIN_PATH;
  loginUrl.search = "";

  if (redirectTo !== EMPLOYEE_DEFAULT_REDIRECT_PATH) {
    loginUrl.searchParams.set("from", redirectTo);
  }

  return loginUrl;
}

function expireSession(response: NextResponse) {
  response.cookies.set({
    name: EMPLOYEE_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === EMPLOYEE_LOGIN_PATH;
  const shouldCheckSession = isLoginPage || isProtectedPath(pathname);

  if (!shouldCheckSession) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    if (isLoginPage) {
      return NextResponse.next();
    }

    return NextResponse.redirect(buildLoginRedirect(request));
  }

  const session = await verifyEmployeeIdToken(sessionToken);

  if (!session) {
    const response = isLoginPage ? NextResponse.next() : NextResponse.redirect(buildLoginRedirect(request));
    expireSession(response);
    return response;
  }

  if (isLoginPage) {
    const redirectTo = sanitizeRedirectTo(request.nextUrl.searchParams.get("from"));
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/past-performance/:path*"],
};
