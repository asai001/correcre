import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBuilding,
  faBullseye,
  faRightLeft,
  faStore,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@operator/components/AdminPageHeader";
import { listOperatorCompaniesFromDynamo } from "@correcre/lib/company-management-server";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

const dashboardCards = [
  {
    href: "/company-registration",
    title: "企業登録",
    description: "新しい企業を追加し、自動採番された companyId で運用対象を増やします。",
    icon: faBuilding,
    accentClassName: "from-cyan-500 to-sky-600",
  },
  {
    href: "/user-registration",
    title: "ユーザー管理",
    description: "対象企業を選択して、ユーザー登録・編集・部門管理を進めます。",
    icon: faUsers,
    accentClassName: "from-emerald-500 to-teal-600",
  },
  {
    href: "/missions",
    title: "ミッション管理",
    description: "対象企業を選択して、ミッション項目の編集・履歴管理を行います。",
    icon: faBullseye,
    accentClassName: "from-amber-500 to-orange-600",
  },
  {
    href: "/merchants",
    title: "提携企業管理",
    description: "商品・サービスを提供する提携企業の登録と、ログインユーザーの招待を行います。",
    icon: faStore,
    accentClassName: "from-violet-500 to-fuchsia-600",
  },
  {
    href: "/exchanges",
    title: "交換管理",
    description: "全提携企業の交換申請を俯瞰し、状態確認と必要に応じた代理操作・強制キャンセルを行います。",
    icon: faRightLeft,
    accentClassName: "from-rose-500 to-pink-600",
  },
] as const;

export default async function DashboardPage() {
  const session = await requireOperatorSession();
  const companies = await listOperatorCompaniesFromDynamo();
  const totalUsers = companies.reduce((sum, company) => sum + company.employeeCount, 0);

  return (
    <div className="space-y-6 pb-5">
      <AdminPageHeader
        title="運用者ダッシュボード"
        adminName={getOperatorDisplayName(session)}
        subtitle="登録企業と運用タスクの入口をここに集約しています。"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">登録企業数</div>
          <div className="mt-4 text-4xl font-bold text-slate-900">{formatNumber(companies.length)}</div>
          <div className="mt-2 text-sm text-slate-500">運用対象として登録されている企業の総数です。</div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">管理ユーザー数</div>
          <div className="mt-4 text-4xl font-bold text-slate-900">{formatNumber(totalUsers)}</div>
          <div className="mt-2 text-sm text-slate-500">現在 mock 上で管理対象になっている全従業員数です。</div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">最新更新企業</div>
          <div className="mt-4 text-2xl font-bold text-slate-900">
            {companies[0]?.companyName ?? "未登録"}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {companies[0]?.companyId ? `companyId: ${companies[0].companyId}` : "まだ企業が登録されていません。"}
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">次のアクション</div>
          <div className="mt-4 text-2xl font-bold text-slate-900">
            {companies.length ? "ユーザー管理へ" : "企業登録へ"}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {companies.length
              ? "対象企業を選択して、ユーザー登録・更新へ進めます。"
              : "最初の企業を登録して運用を開始してください。"}
          </div>
        </div>
      </section>

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
