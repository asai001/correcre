"use client";

import Link from "next/link";
import type { Route } from "next";

// ログイン後の画面の下部に置くメニュー。頻繁には使わない問い合わせ・利用規約をここに置き、
// ヘッダーメニューの項目を減らす。
const FOOTER_LINKS: Array<{ label: string; href: Route; external?: boolean }> = [
  { label: "問い合わせ", href: "/support" as Route },
  { label: "利用ガイド", href: "/docs" as Route, external: true },
  { label: "利用規約", href: "/terms" as Route, external: true },
];

export default function MerchantFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container mx-auto flex flex-col gap-3 px-6 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="フッターメニュー">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="font-semibold text-slate-600 transition hover:text-slate-900 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs text-slate-400">© コレクレ</p>
      </div>
    </footer>
  );
}
