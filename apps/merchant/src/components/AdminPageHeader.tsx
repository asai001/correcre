"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import {
  faArrowLeft,
  faBoxesStacked,
  faBuilding,
  faFileInvoice,
  faGauge,
  faRightLeft,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { logout } from "@merchant/app/lib/actions/authenticate";

type NavItem = {
  label: string;
  href: Route;
  icon: IconDefinition;
};

const NAV_ITEMS: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard" as Route, icon: faGauge },
  { label: "商品・サービス管理", href: "/merchandise" as Route, icon: faBoxesStacked },
  { label: "交換管理", href: "/exchanges" as Route, icon: faRightLeft },
  { label: "収支・精算", href: "/settlement" as Route, icon: faFileInvoice },
  { label: "会社情報", href: "/company-info" as Route, icon: faBuilding },
];

function isActiveNav(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

type AdminPageHeaderProps = {
  title: string;
  adminName: string;
  merchantDisplayName?: string;
  backHref?: Route;
  subtitle?: string;
};

export default function AdminPageHeader({
  title,
  adminName,
  merchantDisplayName,
  backHref,
  subtitle = "提携企業向け 商品・サービス管理",
}: AdminPageHeaderProps) {
  const pathname = usePathname();

  return (
    <section className="relative left-1/2 -mx-[50vw] w-screen bg-[linear-gradient(90deg,#0f766e_0%,#0f4c81_100%)] text-white">
      <div className="container mx-auto flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="前の画面へ戻る"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm font-semibold text-white/85">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 self-end sm:self-auto">
          <div className="text-right">
            {merchantDisplayName ? (
              <div className="max-w-48 truncate text-xs font-semibold text-white/75 sm:max-w-64">
                {merchantDisplayName}
              </div>
            ) : null}
            <div className="text-lg font-bold sm:text-xl">{adminName}</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg">
            <FontAwesomeIcon icon={faUserShield} style={{ color: "#fff", width: "1.5rem", height: "1.5rem" }} />
          </div>
        </div>
      </div>
      <nav aria-label="グローバルメニュー" className="border-t border-white/15 bg-black/20">
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
                        : "border-transparent text-white/75 hover:border-white/40 hover:text-white"
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
