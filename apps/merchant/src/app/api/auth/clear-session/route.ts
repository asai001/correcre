import { type NextRequest, NextResponse } from "next/server";

import { MERCHANT_DEFAULT_REDIRECT_PATH, MERCHANT_LOGIN_PATH } from "@merchant/lib/auth/constants";
import { sanitizeRedirectTo } from "@merchant/lib/auth/redirect";
import { clearMerchantSession } from "@merchant/lib/auth/session";

function buildLoginUrl(request: NextRequest) {
  const redirectTo = sanitizeRedirectTo(request.nextUrl.searchParams.get("from"));
  const loginUrl = request.nextUrl.clone();

  loginUrl.pathname = MERCHANT_LOGIN_PATH;
  loginUrl.search = "";

  if (redirectTo !== MERCHANT_DEFAULT_REDIRECT_PATH) {
    loginUrl.searchParams.set("from", redirectTo);
  }

  return loginUrl;
}

export async function GET(request: NextRequest) {
  await clearMerchantSession();
  return NextResponse.redirect(buildLoginUrl(request));
}
