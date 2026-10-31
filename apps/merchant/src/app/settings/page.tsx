import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faBuilding, faCalendarDays, faUsers } from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@merchant/components/AdminPageHeader";
import {
  getMerchantHeaderInfo,
  getMerchantViewerName,
  isMerchantAdminUser,
  requireCurrentMerchantUser,
} from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

// 各種設定のハブ。普段の業務で頻繁には開かない画面をまとめ、ヘッダーメニューの項目を減らす。
const settingCards = [
  {
    href: "/calendar" as const,
    title: "休業日カレンダー",
    description: "定休日や臨時休業日を登録します。お届け候補日の自動生成から除外されます。",
    icon: faCalendarDays,
    accentClassName: "from-sky-500 to-blue-600",
  },
  {
    href: "/company-info" as const,
    title: "会社情報",
    description: "会社名・住所・連絡先・振込先などを確認・編集します。",
    icon: faBuilding,
    accentClassName: "from-teal-500 to-emerald-600",
    adminOnly: true,
  },
  {
    href: "/users" as const,
    title: "ユーザー管理",
    description: "自社のログインユーザーを招待し、権限や利用状況を管理します。",
    icon: faUsers,
    accentClassName: "from-violet-500 to-indigo-600",
    adminOnly: true,
  },
];

export default async function SettingsPage() {
  const currentUser = await requireCurrentMerchantUser();
  // 会社情報・ユーザー管理は管理者ロール（MERCHANT_ADMIN）専用のため、一般ユーザーには導線を出さない。
  const isAdmin = isMerchantAdminUser(currentUser);
  const headerInfo = await getMerchantHeaderInfo(currentUser.merchantId);
  const visibleCards = isAdmin ? settingCards : settingCards.filter((card) => !card.adminOnly);

  return (
    <div className="space-y-6 pb-5">
      <AdminPageHeader
        title="各種設定"
        adminName={getMerchantViewerName(currentUser)}
        merchantDisplayName={headerInfo.displayName}
        subtitle="休業日・会社情報・ユーザーなどの設定をまとめています。"
        backHref="/dashboard"
      />

      <section className="grid gap-6 lg:grid-cols-3">
        {visibleCards.map((card) => (
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

      {!isAdmin ? (
        <p className="text-sm text-slate-500">会社情報とユーザー管理は、自社の管理者のみが利用できます。</p>
      ) : null}
    </div>
  );
}
