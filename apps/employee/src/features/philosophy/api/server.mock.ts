import { Philosophy } from "../model/types";
import data from "../../../../../mock/dynamodb.json";

/**
 * 理念情報を取得
 *
 * @param companyId
 * @returns
 */
async function getPhilosophy(companyId: string) {
  const Items = data.Philosophy;
  const Item = Items.find((i) => i.companyId === companyId);

  if (!Item) {
    return null;
  }

  return Item;
}

/**
 * ダッシュボードに表示する理念情報を返す
 *
 * @param companyId
 * @returns
 */
export const getPhilosophyFromDynamoMock = async (companyId: string): Promise<Philosophy | null> => {
  const res = await getPhilosophy(companyId);

  return {
    corporatePhilosophy: res?.corporatePhilosophy,
    purpose: res?.purpose,
  };
};
