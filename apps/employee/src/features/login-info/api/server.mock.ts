import { LoginInfo } from "../model/types";
import data from "../../../../../mock/dynamodb.json";
import { toYYYYMMDDHHmmss } from "@correcre/lib";

/**
 * ユーザー情報を取得
 *
 * @param companyId
 * @returns
 */
async function getUser(companyId: string, userId: string) {
  const Items = data.User;
  const Item = Items.find((i) => i.companyId === companyId && i.userId === userId);

  if (!Item) {
    return null;
  }

  return Item;
}

/**
 * ダッシュボードに表示するユーザー情報を返す
 *
 * @param companyId
 * @returns
 */
export const getLoginInfoFromDynamoMock = async (companyId: string, userId: string): Promise<LoginInfo | null> => {
  const res = await getUser(companyId, userId);

  if (!res) {
    return null;
  }

  const lastLoginAt = toYYYYMMDDHHmmss(new Date(res.lastLoginAt)).replace("T", " ").replaceAll("-", "/");

  return {
    displayName: res.name,
    departmentName: res.department,
    lastLoginAt,
  };
};
