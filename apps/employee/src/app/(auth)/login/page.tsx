import Image from "next/image";
import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "@employee/components/auth/LoginForm";
import { EMPLOYEE_LOGIN_NOTICE_COOKIE_NAME } from "@employee/lib/auth/constants";
import { getLoginNoticeMessage } from "@employee/lib/auth/errors";
import { pickFirstQueryValue, sanitizeRedirectTo } from "@employee/lib/auth/redirect";
import { getEmployeeSession } from "@employee/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    from?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params, cookieStore] = await Promise.all([getEmployeeSession(), searchParams, cookies()]);
  const redirectTo = sanitizeRedirectTo(pickFirstQueryValue(params.from));
  const defaultEmail = pickFirstQueryValue(params.email) ?? "";
  const noticeMessage = getLoginNoticeMessage(cookieStore.get(EMPLOYEE_LOGIN_NOTICE_COOKIE_NAME)?.value);

  if (session) {
    redirect(redirectTo as Route);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-gradient-to-br from-blue-200 via-teal-50 to-blue-200">
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="" width={160} height={37} />
      <div className="mt-12 w-9/10 max-w-[400px]">
        <LoginForm defaultEmail={defaultEmail} noticeMessage={noticeMessage} redirectTo={redirectTo} />
      </div>
      <Image
        className="absolute bottom-5 right-7.5 h-auto w-16 lg:bottom-15 lg:right-20 lg:w-[110px]"
        src="/favicon.svg"
        alt=""
        width={110}
        height={110}
      />
    </div>
  );
}
