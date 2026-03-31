import { redirect } from "next/navigation";

import { OPERATOR_DEFAULT_REDIRECT_PATH, OPERATOR_LOGIN_PATH } from "@operator/lib/auth/constants";
import { getOperatorSession } from "@operator/lib/auth/session";

export default async function Home() {
  const session = await getOperatorSession();

  redirect(session ? OPERATOR_DEFAULT_REDIRECT_PATH : OPERATOR_LOGIN_PATH);
}
