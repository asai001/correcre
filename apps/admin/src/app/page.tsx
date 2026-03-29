import { redirect } from "next/navigation";

import { ADMIN_DEFAULT_REDIRECT_PATH, ADMIN_LOGIN_PATH } from "@admin/lib/auth/constants";
import { getAdminSession } from "@admin/lib/auth/session";

export default async function Home() {
  const session = await getAdminSession();

  redirect(session ? ADMIN_DEFAULT_REDIRECT_PATH : ADMIN_LOGIN_PATH);
}
