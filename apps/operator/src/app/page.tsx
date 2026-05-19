import { redirect } from "next/navigation";

import { OPERATOR_DEFAULT_REDIRECT_PATH, OPERATOR_LOGIN_PATH } from "@operator/lib/auth/constants";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";
import { clearOperatorSession } from "@operator/lib/auth/session";

export default async function Home() {
  const access = await getOperatorAccessStatus();

  if (access.allowed) {
    redirect(OPERATOR_DEFAULT_REDIRECT_PATH);
  }

  if (access.reason === "forbidden") {
    await clearOperatorSession();
  }

  redirect(OPERATOR_LOGIN_PATH);
}
