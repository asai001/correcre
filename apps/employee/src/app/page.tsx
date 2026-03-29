import { redirect } from "next/navigation";

import { EMPLOYEE_DEFAULT_REDIRECT_PATH, EMPLOYEE_LOGIN_PATH } from "@employee/lib/auth/constants";
import { getEmployeeSession } from "@employee/lib/auth/session";

export default async function Home() {
  const session = await getEmployeeSession();

  redirect(session ? EMPLOYEE_DEFAULT_REDIRECT_PATH : EMPLOYEE_LOGIN_PATH);
}
