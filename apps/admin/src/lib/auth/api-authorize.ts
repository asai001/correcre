import "server-only";

import { NextResponse } from "next/server";

import type { DBUserItem } from "@correcre/types";

import { getAdminUserForSession } from "./current-user";
import { getAdminSession } from "./session";

export type AdminApiAuthorization =
  | { unauthorized: NextResponse; currentAdminUser: null }
  | { unauthorized: null; currentAdminUser: DBUserItem };

// 管理者アプリの Route Handler 共通の認可。
// セッション無し → 401 unauthorized、セッションはあるが ADMIN ロールのユーザーに紐付かない
// （または所属企業が無効）→ 403 admin_only。
export async function authorizeAdminApiRequest(): Promise<AdminApiAuthorization> {
  const session = await getAdminSession();

  if (!session) {
    return {
      unauthorized: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      currentAdminUser: null,
    };
  }

  const currentAdminUser = await getAdminUserForSession(session);

  if (!currentAdminUser) {
    return {
      unauthorized: NextResponse.json({ error: "admin_only" }, { status: 403 }),
      currentAdminUser: null,
    };
  }

  return {
    unauthorized: null,
    currentAdminUser,
  };
}

// 読み取り系 API はクエリで companyId を受け取ってきた経緯があるが、対象企業は常にセッションの
// 管理者の所属企業とする。別企業を指定してきた場合は黙って読み替えず 403 で拒否する
// （クライアント側のバグや意図的な探索を早期に気づけるようにするため）。
export function rejectForeignCompanyQuery(searchParams: URLSearchParams, currentAdminUser: DBUserItem): NextResponse | null {
  const requestedCompanyId = searchParams.get("companyId");

  if (requestedCompanyId && requestedCompanyId !== currentAdminUser.companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return null;
}
