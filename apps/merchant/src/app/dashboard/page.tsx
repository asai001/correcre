import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faBoxesStacked, faRightLeft } from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@merchant/components/AdminPageHeader";
import { getMerchantDisplayName } from "@merchant/lib/auth/display-name";
import { requireMerchantSession } from "@merchant/lib/auth/merchant";

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
];

export default async function DashboardPage() {
  const session = await requireMerchantSession();

  return (
    <div className="space-y-6 pb-5">
      <AdminPageHeader
        title="提携企業ダッシュボード"
        adminName={getMerchantDisplayName(session)}
        subtitle="商品・サービスの掲載と交換管理の入口です。"
      />

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
