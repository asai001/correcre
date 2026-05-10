import Image from "next/image";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { RegistrationForm } from "@merchant/features/registration";
import { MERCHANT_DEFAULT_REDIRECT_PATH } from "@merchant/lib/auth/constants";
import { getMerchantSession } from "@merchant/lib/auth/session";

export default async function RegisterPage() {
  const session = await getMerchantSession();

  if (session) {
    redirect(MERCHANT_DEFAULT_REDIRECT_PATH as Route);
  }

  return (
    <>
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="" width={160} height={37} />
      <div className="mt-12 mb-16 w-9/10 max-w-[720px] lg:mb-20">
        <RegistrationForm />
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
