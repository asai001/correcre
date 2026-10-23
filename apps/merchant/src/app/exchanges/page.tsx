import { ExchangeList } from "@merchant/features/exchanges";
import { listExchangesForMerchant } from "@merchant/features/exchanges/api/server";
import { parseExchangeListFilter } from "@merchant/features/exchanges/model/filter";
import {
  getMerchantHeaderInfo,
  getMerchantViewerName,
  requireCurrentMerchantUser,
} from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

type ExchangesPageProps = {
  // 収支・精算の「完了待ちの交換」などから、絞り込んだ状態で開けるようにする（?status=UNFINISHED）。
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function ExchangesPage({ searchParams }: ExchangesPageProps) {
  const [user, params] = await Promise.all([requireCurrentMerchantUser(), searchParams]);
  const filter = parseExchangeListFilter(Array.isArray(params.status) ? params.status[0] : params.status);
  const [items, headerInfo] = await Promise.all([
    listExchangesForMerchant(user.merchantId, filter),
    getMerchantHeaderInfo(user.merchantId),
  ]);

  return (
    <ExchangeList
      initialItems={items}
      initialFilter={filter}
      merchantName={getMerchantViewerName(user)}
      merchantDisplayName={headerInfo.displayName}
    />
  );
}
