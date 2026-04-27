import AdminPageHeader from "@merchant/components/AdminPageHeader";
import { getMerchantDisplayName } from "@merchant/lib/auth/display-name";
import { requireMerchantSession } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function MerchandisePage() {
  const session = await requireMerchantSession();

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="商品・サービス管理"
        adminName={getMerchantDisplayName(session)}
        subtitle="掲載商品・サービスの登録、編集、公開状態の管理"
        backHref="/dashboard"
      />
      <div className="rounded-[28px] bg-white p-10 text-center text-slate-500 shadow-lg shadow-slate-200/70">
        この画面は次のフェーズで実装します。
      </div>
    </div>
  );
}
