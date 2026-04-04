import Image from "next/image";
import type { Route } from "next";
import { redirect } from "next/navigation";

import LoginForm from "@operator/components/auth/LoginForm";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";
import { pickFirstQueryValue, sanitizeRedirectTo } from "@operator/lib/auth/redirect";
import { clearOperatorSession } from "@operator/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{
    from?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [access, params] = await Promise.all([getOperatorAccessStatus(), searchParams]);
  const redirectTo = sanitizeRedirectTo(pickFirstQueryValue(params.from));

  if (access.allowed) {
    redirect(redirectTo as Route);
  }

  if (access.reason === "forbidden") {
    await clearOperatorSession();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-white">
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
