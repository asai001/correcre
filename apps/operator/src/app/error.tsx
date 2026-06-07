"use client";

import { useEffect } from "react";
import Image from "next/image";

import { logout } from "@operator/app/lib/actions/authenticate";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page render error", error);
  }, [error]);

  return (
    <main className="fixed inset-0 z-50 flex min-h-dvh flex-col items-center overflow-hidden bg-[#CFE0FF] px-6">
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="コレクレ" width={160} height={37} />

      <section className="mt-12 w-full max-w-[400px] rounded bg-white px-8 py-10 text-center shadow-sm">
        <div className="text-sm font-semibold text-slate-400">ERROR</div>
        <h1 className="mt-3 text-xl font-bold text-slate-900">エラーが発生しました。</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          ページの読み込み中に問題が発生しました。時間をおいて再度お試しください。
        </p>

        <button
          type="button"
          onClick={() => reset()}
          className="mt-8 w-full rounded bg-[#0EA5B7] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0b8fa0]"
        >
          再試行する
        </button>

        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="w-full rounded border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            ログイン画面へ
          </button>
        </form>

        {error.digest ? <p className="mt-6 text-xs text-slate-400">エラーID: {error.digest}</p> : null}
      </section>

      <Image
        className="absolute bottom-5 right-7.5 h-auto w-16 lg:bottom-15 lg:right-20 lg:w-[110px]"
        src="/favicon.svg"
        alt=""
        width={110}
        height={110}
      />
    </main>
  );
}
