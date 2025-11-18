import { LoginInfo } from "../model/types";
import data from "../../../../../mock/dynamodb.json";
import { Company } from "@correcre/types";

/**
 * ユーザー情報を取得
 *
 * @param companyId
 * @returns
 */
async function getUser(companyId: string, userId: string) {
  const Items = data.User;
  const Item = Items.find((i) => i.companyId === companyId && i.userId === userId && i.roles.includes("ADMIN"));

  if (!Item) {
    return null;
  }

  return Item;
}

async function getCompany(companyId: string): Promise<Company | null> {
  const Items = data.Company;
  const Item = Items.find((i) => i.companyId === companyId);

  if (!Item) {
    return null;
  }

  return Item as Company;
}

/**
 * ダッシュボードに表示するユーザー情報を返す
 *
 * @param companyId
 * @returns
 */
export const getLoginInfoFromDynamoMock = async (companyId: string, userId: string): Promise<LoginInfo | null> => {
  const user = await getUser(companyId, userId);
  const company = await getCompany(companyId);

  if (!user || !company) {
    return null;
  }

  return {
    name: user.name,
    activeEmployees: company.activeEmployees,
  };
};
