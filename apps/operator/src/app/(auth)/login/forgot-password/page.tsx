import Image from "next/image";
import type { Route } from "next";
import { redirect } from "next/navigation";

import ForgotPasswordForm from "@operator/components/auth/ForgotPasswordForm";
import { getLoginErrorMessage } from "@operator/lib/auth/errors";
import { pickFirstQueryValue, sanitizeRedirectTo } from "@operator/lib/auth/redirect";
import { getOperatorSession } from "@operator/lib/auth/session";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    error?: string | string[];
    from?: string | string[];
    sent?: string | string[];
  }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const [session, params] = await Promise.all([getOperatorSession(), searchParams]);
  const redirectTo = sanitizeRedirectTo(pickFirstQueryValue(params.from));
  const email = pickFirstQueryValue(params.email) ?? "";
  const emailSent = pickFirstQueryValue(params.sent) === "1";
  const errorMessage = getLoginErrorMessage(pickFirstQueryValue(params.error));

  if (session) {
    redirect(redirectTo as Route);
  }

  return (
    <>
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="" width={160} height={37} />
      <div className="mt-12 mb-16 w-9/10 max-w-[440px] lg:mb-20">
        <ForgotPasswordForm email={email} emailSent={emailSent} errorMessage={errorMessage} redirectTo={redirectTo} />
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
