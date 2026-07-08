"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import {
  faChartBar,
  faCog,
  faGauge,
  faHeadset,
  faUsers,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { logout } from "@admin/app/lib/actions/authenticate";

type NavItem = {
  label: string;
  href: Route;
  icon: IconDefinition;
};

const NAV_ITEMS: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard" as Route, icon: faGauge },
  { label: "ユーザー管理", href: "/employee-management" as Route, icon: faUsers },
  { label: "分析・レポート", href: "/analysis-report" as Route, icon: faChartBar },
  { label: "各種情報", href: "/info" as Route, icon: faCog },
  { label: "問い合わせ", href: "/support" as Route, icon: faHeadset },
];

function isActiveNav(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

type AdminPageHeaderProps = {
  title: string;
  adminName: string;
  subtitle?: string;
};

export default function AdminPageHeader({
  title,
  adminName,
  subtitle = "コレクレ管理システム",
}: AdminPageHeaderProps) {
  const pathname = usePathname();

  return (
    <section className="relative left-1/2 -mx-[50vw] w-screen bg-[#1e40af] text-white">
      <div className="container mx-auto flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm font-semibold text-blue-100/80">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4 self-end sm:self-auto">
          <div className="text-right">
            <div className="text-lg font-bold sm:text-xl">{adminName}</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg">
            <FontAwesomeIcon icon={faUserShield} style={{ color: "#fff", width: "1.5rem", height: "1.5rem" }} />
          </div>
        </div>
      </div>
      <nav aria-label="グローバルメニュー" className="border-t border-white/10 bg-[#1e3a8a]">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-6">
          <ul className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActiveNav(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "border-white text-white"
                        : "border-transparent text-blue-100/75 hover:border-white/40 hover:text-white"
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="text-xs" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <form action={logout} className="py-2">
            <button
              type="submit"
              className="rounded-full border border-white/30 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              ログアウト
            </button>
          </form>
        </div>
      </nav>
    </section>
  );
}
