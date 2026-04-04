import Image from "next/image";
import type { Route } from "next";
import { redirect } from "next/navigation";

import LoginForm from "@employee/components/auth/LoginForm";
import { pickFirstQueryValue, sanitizeRedirectTo } from "@employee/lib/auth/redirect";
import { getEmployeeSession } from "@employee/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{
    from?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([getEmployeeSession(), searchParams]);
  const redirectTo = sanitizeRedirectTo(pickFirstQueryValue(params.from));

  if (session) {
    redirect(redirectTo as Route);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-gradient-to-br from-blue-200 via-teal-50 to-blue-200">
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="" width={160} height={37} />
      <div className="mt-12 w-9/10 max-w-[400px]">
        <LoginForm redirectTo={redirectTo} />
      </div>
      <Image
        className="absolute bottom-5 right-7.5 h-auto w-16 lg:bottom-15 lg:right-20 lg:w-[110px]"
        src="/correcre-icon.svg"
        alt=""
        width={110}
        height={66}
      />
    </div>
  );
}
