import { redirect } from "next/navigation";

import { MERCHANT_DEFAULT_REDIRECT_PATH, MERCHANT_LOGIN_PATH } from "@merchant/lib/auth/constants";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";
import { clearMerchantSession } from "@merchant/lib/auth/session";

export default async function Home() {
  const access = await getMerchantAccessStatus();

  if (access.allowed) {
    redirect(MERCHANT_DEFAULT_REDIRECT_PATH);
  }

  if (access.reason === "forbidden") {
    await clearMerchantSession();
  }

  redirect(MERCHANT_LOGIN_PATH);
}
