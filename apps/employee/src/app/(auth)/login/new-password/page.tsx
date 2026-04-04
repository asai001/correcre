import Image from "next/image";
import type { Route } from "next";
import { redirect } from "next/navigation";

import NewPasswordForm from "@employee/components/auth/NewPasswordForm";
import {
  EMPLOYEE_DEFAULT_REDIRECT_PATH,
  EMPLOYEE_LOGIN_PATH,
} from "@employee/lib/auth/constants";
import { getLoginErrorMessage } from "@employee/lib/auth/errors";
import { pickFirstQueryValue, sanitizeRedirectTo } from "@employee/lib/auth/redirect";
import { getEmployeeSession, getPendingNewPasswordChallenge } from "@employee/lib/auth/session";

type NewPasswordPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    from?: string | string[];
  }>;
};

function buildLoginRedirect(redirectTo: string) {
  if (redirectTo === EMPLOYEE_DEFAULT_REDIRECT_PATH) {
    return EMPLOYEE_LOGIN_PATH;
  }

  const params = new URLSearchParams({ from: redirectTo });
  return `${EMPLOYEE_LOGIN_PATH}?${params.toString()}`;
}

export default async function NewPasswordPage({ searchParams }: NewPasswordPageProps) {
  const [session, challenge, params] = await Promise.all([
    getEmployeeSession(),
    getPendingNewPasswordChallenge(),
    searchParams,
  ]);
  const redirectTo = sanitizeRedirectTo(pickFirstQueryValue(params.from));
  const errorMessage = getLoginErrorMessage(pickFirstQueryValue(params.error));

  if (session) {
    redirect(redirectTo as Route);
  }

  if (!challenge) {
    redirect(buildLoginRedirect(redirectTo) as Route);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-gradient-to-br from-blue-200 via-teal-50 to-blue-200">
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="" width={160} height={37} />
      <div className="mt-12 w-9/10 max-w-[400px]">
        <NewPasswordForm email={challenge.email} errorMessage={errorMessage} redirectTo={redirectTo} />
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
