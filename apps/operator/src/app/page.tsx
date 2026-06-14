import type { Route } from "next";
import { redirect } from "next/navigation";

import { OPERATOR_DEFAULT_REDIRECT_PATH, OPERATOR_LOGIN_PATH } from "@operator/lib/auth/constants";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";
import { buildClearOperatorSessionRedirect } from "@operator/lib/auth/redirect";

export default async function Home() {
  const access = await getOperatorAccessStatus();

  if (access.allowed) {
    redirect(OPERATOR_DEFAULT_REDIRECT_PATH);
  }

  if (access.reason === "forbidden") {
    redirect(buildClearOperatorSessionRedirect() as Route);
  }

  redirect(OPERATOR_LOGIN_PATH);
}
