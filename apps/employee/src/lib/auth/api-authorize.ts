import "server-only";

import { NextResponse } from "next/server";

import type { DBUserItem } from "@correcre/types";

import { getEmployeeUserForSession } from "./current-user";
import { getEmployeeSession } from "./session";

export type EmployeeApiAuthorization =
  | { unauthorized: NextResponse; currentUser: null }
  | { unauthorized: null; currentUser: DBUserItem };

// 従業員アプリの Route Handler 共通の認可。
// セッション無し → 401 unauthorized、セッションはあるが EMPLOYEE ロールのユーザーに紐付かない
// （または所属企業が無効）→ 403 employee_only。
export async function authorizeEmployeeApiRequest(): Promise<EmployeeApiAuthorization> {
  const session = await getEmployeeSession();

  if (!session) {
    return {
      unauthorized: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      currentUser: null,
    };
  }

  const currentUser = await getEmployeeUserForSession(session);

  if (!currentUser) {
    return {
      unauthorized: NextResponse.json({ error: "employee_only" }, { status: 403 }),
      currentUser: null,
    };
  }

  return {
    unauthorized: null,
    currentUser,
  };
}

// 読み取り系 API はクエリで companyId / userId を受け取ってきた経緯があるが、従業員が見られるのは
// 自分の所属企業の、自分自身のデータだけ。別企業・別ユーザーを指定してきた場合は黙って読み替えず
// 403 で拒否する（クライアント側のバグや意図的な探索を早期に気づけるようにするため）。
export function rejectForeignScopeQuery(
  searchParams: URLSearchParams,
  currentUser: DBUserItem,
  options: { checkUserId?: boolean } = { checkUserId: true },
): NextResponse | null {
  const requestedCompanyId = searchParams.get("companyId");

  if (requestedCompanyId && requestedCompanyId !== currentUser.companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (options.checkUserId !== false) {
    const requestedUserId = searchParams.get("userId");

    if (requestedUserId && requestedUserId !== currentUser.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  return null;
}
