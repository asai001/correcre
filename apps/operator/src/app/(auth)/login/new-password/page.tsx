import Image from "next/image";
import type { Route } from "next";
import { redirect } from "next/navigation";

import NewPasswordForm from "@operator/components/auth/NewPasswordForm";
import { OPERATOR_DEFAULT_REDIRECT_PATH, OPERATOR_LOGIN_PATH } from "@operator/lib/auth/constants";
import { getLoginErrorMessage } from "@operator/lib/auth/errors";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";
import { pickFirstQueryValue, sanitizeRedirectTo } from "@operator/lib/auth/redirect";
import { clearOperatorSession, getPendingNewPasswordChallenge } from "@operator/lib/auth/session";

type NewPasswordPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    from?: string | string[];
  }>;
};

function buildLoginRedirect(redirectTo: string) {
  if (redirectTo === OPERATOR_DEFAULT_REDIRECT_PATH) {
    return OPERATOR_LOGIN_PATH;
  }

  const params = new URLSearchParams({ from: redirectTo });
  return `${OPERATOR_LOGIN_PATH}?${params.toString()}`;
}

export default async function NewPasswordPage({ searchParams }: NewPasswordPageProps) {
  const [access, challenge, params] = await Promise.all([
    getOperatorAccessStatus(),
    getPendingNewPasswordChallenge(),
    searchParams,
  ]);
  const redirectTo = sanitizeRedirectTo(pickFirstQueryValue(params.from));
  const errorMessage = getLoginErrorMessage(pickFirstQueryValue(params.error));

  if (access.allowed) {
    redirect(redirectTo as Route);
  }

  if (access.reason === "forbidden") {
    await clearOperatorSession();
  }

  if (!challenge) {
    redirect(buildLoginRedirect(redirectTo) as Route);
  }

  return (
    <>
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="" width={160} height={37} />
      <div className="mt-12 mb-16 w-9/10 max-w-[440px] lg:mb-20">
        <NewPasswordForm email={challenge.email} errorMessage={errorMessage} redirectTo={redirectTo} />
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
