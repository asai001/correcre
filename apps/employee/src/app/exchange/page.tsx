import { ExchangeList } from "@employee/features/exchange";
import { listPublishedMerchandiseForEmployee } from "@employee/features/exchange/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function ExchangePage() {
  const currentUser = await requireCurrentEmployeeUser();
  const items = await listPublishedMerchandiseForEmployee();

  return <ExchangeList items={items} currentPointBalance={currentUser.currentPointBalance ?? 0} />;
}
