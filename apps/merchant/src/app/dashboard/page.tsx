import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faBoxesStacked, faFileInvoice, faRightLeft } from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@merchant/components/AdminPageHeader";
import { joinNameParts } from "@correcre/lib/user-profile";
import { DashboardCards, getMerchantDashboardData } from "@merchant/features/dashboard";
import { getMerchantHeaderInfo, requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

const dashboardCards = [
  {
    href: "/merchandise" as const,
    title: "商品・サービス管理",
    description: "コレクレに掲載する商品・サービスを登録、編集、公開状態を管理します。",
    icon: faBoxesStacked,
    accentClassName: "from-cyan-500 to-sky-600",
  },
  {
    href: "/exchanges" as const,
    title: "交換管理",
    description: "従業員から申請された商品・サービスの交換を確認し、状態を更新します。",
    icon: faRightLeft,
    accentClassName: "from-emerald-500 to-teal-600",
  },
  {
    href: "/settlement" as const,
    title: "収支・精算",
    description: "月ごとの売上と運用者へのご請求額を確認し、請求メールを送信します。",
    icon: faFileInvoice,
    accentClassName: "from-amber-500 to-orange-600",
  },
];

export default async function DashboardPage() {
  const currentUser = await requireCurrentMerchantUser();
  const [dashboard, headerInfo] = await Promise.all([
    getMerchantDashboardData(currentUser.merchantId),
    getMerchantHeaderInfo(currentUser.merchantId),
  ]);

  return (
    <div className="space-y-6 pb-5">
      <AdminPageHeader
        title="提携企業ダッシュボード"
        adminName={headerInfo.contactPersonName || joinNameParts(currentUser.lastName, currentUser.firstName)}
        merchantDisplayName={headerInfo.displayName}
        subtitle="商品・サービスの掲載状況と直近の交換申請を集約します。"
      />

      <DashboardCards data={dashboard} />

      <section className="grid gap-6 lg:grid-cols-2">
        {dashboardCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group overflow-hidden rounded-[32px] bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-28px_rgba(15,23,42,0.42)]"
          >
            <div className={`h-2 bg-gradient-to-r ${card.accentClassName}`} />
            <div className="p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FontAwesomeIcon icon={card.icon} className="text-xl" />
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-slate-900 group-hover:text-white">
                  <FontAwesomeIcon icon={faArrowRight} />
                </div>
              </div>
              <div className="mt-8 text-2xl font-bold text-slate-900">{card.title}</div>
              <div className="mt-3 text-sm leading-7 text-slate-500">{card.description}</div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
