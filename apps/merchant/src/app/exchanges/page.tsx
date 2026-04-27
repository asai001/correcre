import AdminPageHeader from "@merchant/components/AdminPageHeader";
import { getMerchantDisplayName } from "@merchant/lib/auth/display-name";
import { requireMerchantSession } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function ExchangesPage() {
  const session = await requireMerchantSession();

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="交換管理"
        adminName={getMerchantDisplayName(session)}
        subtitle="従業員からの交換申請の確認と状態更新"
        backHref="/dashboard"
      />
      <div className="rounded-[28px] bg-white p-10 text-center text-slate-500 shadow-lg shadow-slate-200/70">
        この画面は次のフェーズで実装します。
      </div>
    </div>
  );
}
