"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { DOCS_GROUPS } from "./docs-nav";

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  // 「はじめに」を ★、以降の章を 1, 2, 3... と番号付けする
  let index = 0;

  return (
    <nav aria-label="操作ガイドの目次" className="space-y-4">
      {DOCS_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="px-3 text-[11px] font-bold tracking-wider text-slate-400">{group.label}</div>
          <ul className="mt-1.5 space-y-0.5">
            {group.chapters.map((chapter) => {
              const chapterNumber = index;
              index += 1;
              const active = pathname === chapter.href;
              return (
                <li key={chapter.href}>
                  <Link
                    href={chapter.href as Route}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-start gap-2.5 rounded-xl px-3 py-1.5 text-sm transition ${
                      active
                        ? "bg-teal-50 font-bold text-teal-800"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        active ? "bg-teal-700 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {chapterNumber === 0 ? "★" : chapterNumber}
                    </span>
                    <span className="leading-6">
                      {chapter.title}
                      {chapter.adminOnly ? (
                        <span className="ml-1.5 whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          管理者
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocsSideNav() {
  const pathname = usePathname() ?? "/docs";
  return <NavList pathname={pathname} />;
}

// スマートフォンなど画面が狭いときは、目次を折りたたんでページ上部に置く
export function DocsMobileNav() {
  const pathname = usePathname() ?? "/docs";

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold text-slate-800">
        目次を開く
        <span className="text-slate-400 transition group-open:rotate-180">▼</span>
      </summary>
      <div className="border-t border-slate-100 px-2 py-4">
        <NavList
          pathname={pathname}
          onNavigate={() => {
            document.querySelectorAll("details[open]").forEach((element) => element.removeAttribute("open"));
          }}
        />
      </div>
    </details>
  );
}
