import type { DBUserItem } from "@correcre/types";

import type { AdminSession } from "@admin/lib/auth/verify-token";

jest.mock("@admin/lib/auth/session", () => ({ getAdminSession: jest.fn() }));
jest.mock("@admin/lib/auth/current-user", () => ({ getAdminUserForSession: jest.fn() }));

import { getAdminUserForSession } from "@admin/lib/auth/current-user";
import { getAdminSession } from "@admin/lib/auth/session";

import { authorizeEmployeeManagementRequest } from "../authorize";

// 管理者アプリの Route Handler が共通で使う認可。
// セッション無し → 401、セッションはあるが ADMIN ロールのユーザーに紐付かない（または所属企業が無効）→ 403。
const session = { sessionId: "session-1", role: "ADMIN", cognitoSub: "sub-1" } as unknown as AdminSession;
const adminUser = { companyId: "company-1", userId: "admin-1", roles: ["ADMIN"], status: "ACTIVE" } as DBUserItem;

const mockedGetSession = jest.mocked(getAdminSession);
const mockedGetUser = jest.mocked(getAdminUserForSession);

beforeEach(() => {
  jest.clearAllMocks();
});

test("セッションが無ければ 401 unauthorized。ユーザー検索はしない", async () => {
  mockedGetSession.mockResolvedValue(null);

  const result = await authorizeEmployeeManagementRequest();

  expect(result.currentAdminUser).toBeNull();
  expect(result.unauthorized?.status).toBe(401);
  await expect(result.unauthorized!.json()).resolves.toEqual({ error: "unauthorized" });
  expect(mockedGetUser).not.toHaveBeenCalled();
});

test("セッションがあっても管理者ユーザーに解決できなければ 403 admin_only", async () => {
  mockedGetSession.mockResolvedValue(session);
  mockedGetUser.mockResolvedValue(null);

  const result = await authorizeEmployeeManagementRequest();

  expect(result.currentAdminUser).toBeNull();
  expect(result.unauthorized?.status).toBe(403);
  await expect(result.unauthorized!.json()).resolves.toEqual({ error: "admin_only" });
  expect(mockedGetUser).toHaveBeenCalledWith(session);
});

test("管理者ユーザーに解決できれば許可し、そのユーザーを返す", async () => {
  mockedGetSession.mockResolvedValue(session);
  mockedGetUser.mockResolvedValue(adminUser);

  const result = await authorizeEmployeeManagementRequest();

  expect(result.unauthorized).toBeNull();
  expect(result.currentAdminUser).toBe(adminUser);
});
