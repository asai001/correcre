import type { DBUserItem } from "@correcre/types";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`);
    error.name = "NEXT_REDIRECT";
    throw error;
  }),
}));
jest.mock("../session", () => ({ getEmployeeSession: jest.fn() }));
jest.mock("@correcre/lib/dynamodb/user", () => ({ listUsersByCognitoSub: jest.fn() }));
jest.mock("@correcre/lib/dynamodb/company", () => ({ getCompanyById: jest.fn() }));

import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { listUsersByCognitoSub } from "@correcre/lib/dynamodb/user";
import { redirect } from "next/navigation";

import { EMPLOYEE_CLEAR_SESSION_PATH } from "../constants";
import { requireCurrentEmployeeUser } from "../current-user";
import { getEmployeeSession } from "../session";

// ページの先頭で呼ぶ requireCurrentEmployeeUser。ログイン後にユーザーが削除された・所属企業が無効化された場合、
// Cookie のセッション自体はまだ有効なため、例外にするとエラー画面になってしまう。
// セッション破棄の Route Handler へリダイレクトして、Cookie を消してからログイン画面へ戻す。
const mockedGetSession = jest.mocked(getEmployeeSession);
const mockedListUsers = jest.mocked(listUsersByCognitoSub);
const mockedGetCompany = jest.mocked(getCompanyById);
const mockedRedirect = jest.mocked(redirect);

const session = { token: "token", payload: { sub: "cognito-sub-1" } } as never;
const activeUser = { companyId: "company-1", userId: "user-1", roles: ["EMPLOYEE"], status: "ACTIVE" } as DBUserItem;

beforeAll(() => {
  process.env.AWS_REGION = "ap-northeast-1";
  process.env.DDB_USER_TABLE_NAME = "user";
  process.env.DDB_COMPANY_TABLE_NAME = "company";
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetSession.mockResolvedValue(session);
  mockedListUsers.mockResolvedValue([activeUser]);
  mockedGetCompany.mockResolvedValue({ companyId: "company-1", status: "ACTIVE" } as never);
});

test("有効なユーザーならそのユーザーを返す", async () => {
  await expect(requireCurrentEmployeeUser()).resolves.toBe(activeUser);
  expect(mockedRedirect).not.toHaveBeenCalled();
});

test("セッションが使えない（未ログイン・失効・破棄済み）なら、Cookie を消すためセッション破棄 API へ", async () => {
  // Cookie だけ残った状態でログイン画面へ直接戻すと、middleware がページへ送り返して行き来が止まらなくなる
  mockedGetSession.mockResolvedValue(null);

  await expect(requireCurrentEmployeeUser()).rejects.toThrow("NEXT_REDIRECT");
  expect(mockedRedirect).toHaveBeenCalledWith(EMPLOYEE_CLEAR_SESSION_PATH);
  expect(mockedListUsers).not.toHaveBeenCalled();
});

test("ユーザーが削除済みなら、エラーにせずセッション破棄 API へリダイレクトする", async () => {
  mockedListUsers.mockResolvedValue([{ ...activeUser, status: "DELETED" }]);

  await expect(requireCurrentEmployeeUser()).rejects.toThrow("NEXT_REDIRECT");
  expect(mockedRedirect).toHaveBeenCalledWith(EMPLOYEE_CLEAR_SESSION_PATH);
});

test("所属企業が無効化されていても、セッション破棄 API へリダイレクトする", async () => {
  mockedGetCompany.mockResolvedValue({ companyId: "company-1", status: "INACTIVE" } as never);

  await expect(requireCurrentEmployeeUser()).rejects.toThrow("NEXT_REDIRECT");
  expect(mockedRedirect).toHaveBeenCalledWith(EMPLOYEE_CLEAR_SESSION_PATH);
});
