import Image from "next/image";
import Link from "next/link";
import type { Metadata, Route } from "next";

import { DocsMobileNav, DocsSideNav } from "./_components/DocsNav";

export const metadata: Metadata = {
  title: {
    default: "提携企業向け 操作ガイド | コレクレ",
    template: "%s | コレクレ 提携企業向け 操作ガイド",
  },
  description: "コレクレ提携企業向けアプリの使い方を、登録申請から画面ごとにスクリーンショット付きで説明します。",
};

type DocsLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

// 操作ガイドはログイン不要で誰でも読める公開ページ（middleware の保護対象に含めない）。
export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-30 bg-[linear-gradient(90deg,#0f766e_0%,#0f4c81_100%)] text-white shadow">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href={"/docs" as Route} className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
              <Image src="/favicon.svg" alt="" width={28} height={28} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-white/80">コレクレ 提携企業</span>
              <span className="block truncate text-lg font-bold sm:text-xl">操作ガイド</span>
            </span>
          </Link>
          <Link
            href={"/login" as Route}
            className="shrink-0 rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            ログイン画面へ
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1240px] gap-10 px-4 py-6 sm:px-6 lg:py-10">
        <aside className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-20 max-h-[calc(100dvh-5.5rem)] overflow-y-auto pb-4">
            <DocsSideNav />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <DocsMobileNav />
          <main className="mt-4 rounded-[28px] bg-white px-5 py-8 shadow-sm ring-1 ring-slate-200/70 sm:px-10 sm:py-10 lg:mt-0">
            {children}
          </main>
          <footer className="mt-8 pb-6 text-center text-xs leading-6 text-slate-400">
            画面の画像は説明用のサンプルです。実際の表示内容・お名前・金額などとは異なります。
            <br />
            画面のデザインは予告なく変更される場合があります。
          </footer>
        </div>
      </div>
    </div>
  );
}
