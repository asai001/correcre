"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { faChartLine, faGauge, faGift, faReceipt } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { logout } from "@employee/app/lib/actions/authenticate";

type NavItem = {
  label: string;
  href: Route;
  icon: IconDefinition;
};

const NAV_ITEMS: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard" as Route, icon: faGauge },
  { label: "ポイント交換", href: "/exchange" as Route, icon: faGift },
  { label: "ポイント交換履歴", href: "/exchange-history" as Route, icon: faReceipt },
  { label: "過去の実績", href: "/past-performance" as Route, icon: faChartLine },
];

const POINT_EXCHANGE_ONLY_HREFS = new Set<string>(["/exchange", "/exchange-history"]);

function isActiveNav(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

type EmployeePageHeaderProps = {
  title: string;
  showPointExchangeLink: boolean;
  right?: ReactNode;
};

export default function EmployeePageHeader({ title, showPointExchangeLink, right }: EmployeePageHeaderProps) {
  const pathname = usePathname();
  const navItems = showPointExchangeLink
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => !POINT_EXCHANGE_ONLY_HREFS.has(item.href));

  return (
    <div className="bg-[#0d2a3d] text-white">
      <div className="container mx-auto flex items-center justify-between gap-6 px-6 py-6">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        </div>
        {right ? <div className="shrink-0 text-right">{right}</div> : null}
      </div>
      <nav aria-label="グローバルメニュー" className="border-t border-white/10 bg-[#0a2231]">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-6">
          <ul className="flex flex-wrap items-center gap-1">
            {navItems.map((item) => {
              const active = isActiveNav(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "border-white text-white"
                        : "border-transparent text-slate-300 hover:border-white/40 hover:text-white"
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
    </div>
  );
}
