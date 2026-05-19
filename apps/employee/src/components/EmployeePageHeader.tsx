"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { faChartLine, faGauge, faGift } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type NavItem = {
  label: string;
  href: Route;
  icon: IconDefinition;
};

const NAV_ITEMS: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard" as Route, icon: faGauge },
  { label: "ポイント交換", href: "/exchange" as Route, icon: faGift },
  { label: "過去の実績", href: "/past-performance" as Route, icon: faChartLine },
];

function isActiveNav(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

type EmployeePageHeaderProps = {
  title: string;
  right?: ReactNode;
};

export default function EmployeePageHeader({ title, right }: EmployeePageHeaderProps) {
  const pathname = usePathname();

  return (
    <div className="bg-[#0d2a3d] text-white">
      <div className="container mx-auto flex items-center justify-between gap-6 px-6 py-6">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        </div>
        {right ? <div className="shrink-0 text-right">{right}</div> : null}
      </div>
      <nav aria-label="グローバルメニュー" className="border-t border-white/10 bg-[#0a2231]">
        <ul className="container mx-auto flex flex-wrap items-center gap-1 px-6">
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
      </nav>
    </div>
  );
}
