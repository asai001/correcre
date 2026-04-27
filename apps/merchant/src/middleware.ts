import { NextRequest, NextResponse } from "next/server";

import {
  MERCHANT_DEFAULT_REDIRECT_PATH,
  MERCHANT_LOGIN_PATH,
  MERCHANT_PROTECTED_PATH_PREFIXES,
  MERCHANT_SESSION_COOKIE_NAME,
} from "@merchant/lib/auth/constants";
import { sanitizeRedirectTo } from "@merchant/lib/auth/redirect";
import { verifyMerchantIdToken } from "@merchant/lib/auth/verify-token";

function isProtectedPath(pathname: string) {
  return MERCHANT_PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildLoginRedirect(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectTo = sanitizeRedirectTo(requestedPath);

  loginUrl.pathname = MERCHANT_LOGIN_PATH;
  loginUrl.search = "";

  if (redirectTo !== MERCHANT_DEFAULT_REDIRECT_PATH) {
    loginUrl.searchParams.set("from", redirectTo);
  }

  return loginUrl;
}

function expireSession(response: NextResponse) {
  response.cookies.set({
    name: MERCHANT_SESSION_COOKIE_NAME,
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
  const isLoginPage = pathname === MERCHANT_LOGIN_PATH || pathname === "/login/new-password" || pathname === "/login/forgot-password";
  const shouldCheckSession = isLoginPage || isProtectedPath(pathname);

  if (!shouldCheckSession) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(MERCHANT_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    if (isLoginPage) {
      return NextResponse.next();
    }

    return NextResponse.redirect(buildLoginRedirect(request));
  }

  const session = await verifyMerchantIdToken(sessionToken);

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
    "/merchandise/:path*",
    "/exchanges/:path*",
  ],
};
