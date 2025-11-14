// 「どうやって サーバーからデータを取るか」だけ知っている層
import type { User } from "../model/types";
import { MOCK_USER_FOR_DASHBOARD } from "../model/user.mock";

// 将来は companyId / userId から SDK で DynamoDB を叩く想定
export async function fetchCurrentUserForDashboard(companyId: string, userId: string): Promise<User | null> {
  console.log("fetchCurrentUserForDashboard", { companyId, userId });

  await new Promise((r) => setTimeout(r, 20)); // モックの通信待ち
  return MOCK_USER_FOR_DASHBOARD;
}
