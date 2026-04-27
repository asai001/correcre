import Image from "next/image";
import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "@merchant/components/auth/LoginForm";
import { MERCHANT_LOGIN_NOTICE_COOKIE_NAME } from "@merchant/lib/auth/constants";
import { getLoginNoticeMessage } from "@merchant/lib/auth/errors";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";
import { pickFirstQueryValue, sanitizeRedirectTo } from "@merchant/lib/auth/redirect";
import { clearMerchantSession } from "@merchant/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    from?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [access, params, cookieStore] = await Promise.all([getMerchantAccessStatus(), searchParams, cookies()]);
  const redirectTo = sanitizeRedirectTo(pickFirstQueryValue(params.from));
  const defaultEmail = pickFirstQueryValue(params.email) ?? "";
  const noticeMessage = getLoginNoticeMessage(cookieStore.get(MERCHANT_LOGIN_NOTICE_COOKIE_NAME)?.value);

  if (access.allowed) {
    redirect(redirectTo as Route);
  }

  if (access.reason === "forbidden") {
    await clearMerchantSession();
  }

  return (
    <>
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="" width={160} height={37} />
      <div className="mt-12 w-9/10 max-w-[400px]">
        <LoginForm defaultEmail={defaultEmail} noticeMessage={noticeMessage} redirectTo={redirectTo} />
      </div>
      <Image
        className="absolute bottom-5 right-7.5 h-auto w-16 lg:bottom-15 lg:right-20 lg:w-[110px]"
        src="/correcre-icon.svg"
        alt=""
        width={110}
        height={66}
      />
    </>
  );
}
