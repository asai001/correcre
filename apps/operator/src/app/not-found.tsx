import Image from "next/image";

export default function NotFound() {
  return (
    <main className="fixed inset-0 z-50 flex min-h-dvh flex-col items-center overflow-hidden bg-[#CFE0FF] px-6">
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="コレクレ" width={160} height={37} />

      <section className="mt-12 w-full max-w-[400px] rounded bg-white px-8 py-10 text-center shadow-sm">
        <div className="text-sm font-semibold text-slate-400">404</div>
        <h1 className="mt-3 text-xl font-bold text-slate-900">お探しのページは見つかりませんでした。</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          ページが移動または削除された可能性があります。ログイン画面から再度アクセスしてください。
        </p>

        <a
          href="/api/auth/clear-session"
          className="mt-8 block w-full rounded bg-[#0EA5B7] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0b8fa0]"
        >
          ログイン画面へ
        </a>
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
