import { NextRequest, NextResponse } from "next/server";

import {
  OPERATOR_DEFAULT_REDIRECT_PATH,
  OPERATOR_LOGIN_PATH,
  OPERATOR_PROTECTED_PATH_PREFIXES,
  OPERATOR_SESSION_COOKIE_NAME,
} from "@operator/lib/auth/constants";
import { sanitizeRedirectTo } from "@operator/lib/auth/redirect";
import { verifyOperatorIdToken } from "@operator/lib/auth/verify-token";

function isProtectedPath(pathname: string) {
  return OPERATOR_PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildLoginRedirect(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectTo = sanitizeRedirectTo(requestedPath);

  loginUrl.pathname = OPERATOR_LOGIN_PATH;
  loginUrl.search = "";

  if (redirectTo !== OPERATOR_DEFAULT_REDIRECT_PATH) {
    loginUrl.searchParams.set("from", redirectTo);
  }

  return loginUrl;
}

function expireSession(response: NextResponse) {
  response.cookies.set({
    name: OPERATOR_SESSION_COOKIE_NAME,
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
  const isLoginPage = pathname === OPERATOR_LOGIN_PATH || pathname === "/login/new-password" || pathname === "/login/forgot-password";
  const shouldCheckSession = isLoginPage || isProtectedPath(pathname);

  if (!shouldCheckSession) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(OPERATOR_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    if (isLoginPage) {
      return NextResponse.next();
    }

    return NextResponse.redirect(buildLoginRedirect(request));
  }

  const session = await verifyOperatorIdToken(sessionToken);

  if (!session) {
    const response = isLoginPage ? NextResponse.next() : NextResponse.redirect(buildLoginRedirect(request));
    expireSession(response);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/login/new-password",
    "/login/forgot-password",
    "/dashboard/:path*",
    "/company-registration/:path*",
    "/user-registration/:path*",
  ],
};
