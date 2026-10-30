import Link from "next/link";
import type { Metadata, Route } from "next";

import { Callout, ChapterBadge, ChapterHeader, Mark, PrevNext, Section, Ui } from "./_components/content";
import { DOCS_CHAPTERS, DOCS_GROUPS, EXCHANGE_BADGE } from "./_components/docs-nav";

export const metadata: Metadata = {
  title: { absolute: "従業員向け 操作ガイド | コレクレ" },
};

const FLOW = [
  { who: "会社", title: "ミッションが決まる", body: "会社の理念に沿った「してほしい行動」が、ミッションとして登録されます。" },
  { who: "あなた", title: "行動して、報告する", body: "ミッションを実行したら、ダッシュボードから報告します。報告すると点数がもらえます。", href: "/docs/mission-report" },
  { who: "コレクレ", title: "点数がポイントになる", body: "今月の点数に応じたポイントが、翌月 1 日に使えるポイントとして反映されます。", href: "/docs/points" },
  { who: "あなた", title: "ポイントで交換する", body: "たまったポイントで、提携企業の商品・サービスと交換できます（会社の設定で有効な場合）。", href: "/docs/exchange" },
  { who: "あなた", title: "ふり返る", body: "過去の実績で、月ごとの点数や達成率を確認できます。", href: "/docs/past-performance" },
];

const WHO_STYLE: Record<string, string> = {
  あなた: "bg-blue-700 text-white",
  会社: "bg-slate-700 text-white",
  コレクレ: "bg-amber-500 text-white",
};

export default function DocsTopPage() {
  let chapterNumber = -1;

  return (
    <article>
      <ChapterHeader
        href="/docs"
        lead={
          <>
            この資料は、コレクレを使う<strong>従業員のみなさま向け</strong>の操作ガイドです。
            はじめての方でも迷わないよう、<strong>最初のログインから、毎日のミッション報告・ポイント交換まで</strong>を、実際の画面の画像を使って順番に説明します。
          </>
        }
        goals={["コレクレがどんな仕組みか", "毎月なにをすればよいか", "この資料の読み方"]}
      />

      <Section id="about" title="コレクレとは">
        <p>
          コレクレは、会社の理念に沿った「良い行動」を<strong>ミッション</strong>として見える化し、実行した人に<strong>点数</strong>を贈る仕組みです。
          点数は<strong>ポイント</strong>に変わり、たまったポイントは提携企業の商品・サービスと交換できます。
        </p>
        <p>
          「理念を行動に、行動をポイントに」。がんばりがきちんと評価され、ご褒美として返ってくる。そんな毎日をつくるためのサービスです。
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { who: "あなた", desc: "従業員のみなさま。ミッションを実行して報告し、点数とポイントを受け取ります。" },
            { who: "会社", desc: "あなたの勤務先の管理者。ミッションの内容や点数を決め、みなさんの取り組みを見守ります。" },
            { who: "コレクレ", desc: "このサービスの運営（em株式会社）。提携企業の商品を取りそろえ、ポイント交換の仕組みを提供します。" },
          ].map((item) => (
            <div key={item.who} className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${WHO_STYLE[item.who]}`}>
                {item.who === "あなた" ? "従業員（あなた）" : item.who}
              </span>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>

        <Callout kind="point" title="点数とポイントの関係">
          <p>
            ミッションを報告すると、そのミッションに決められた<strong>点数</strong>がもらえます（1 か月の満点は 100 点）。
            月末までにためた点数は、会社ごとの換算でポイントに変わり、<strong>翌月 1 日</strong>から使えるようになります。
            くわしくは <Link href={"/docs/points" as Route} className="font-semibold text-blue-700 underline underline-offset-4">ポイントのたまり方と使いかた</Link> をご覧ください。
          </p>
        </Callout>
      </Section>

      <Section id="flow" title="毎月の流れ">
        <p>コレクレでの 1 か月の流れは次のとおりです。各ステップのくわしいやり方は、右端の「くわしく」から確認できます。</p>
        <ol className="space-y-3">
          {FLOW.map((step, index) => (
            <li key={step.title} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-base font-bold text-white">
                  {index + 1}
                </div>
                {index < FLOW.length - 1 ? <div aria-hidden className="mt-1 w-0.5 flex-1 bg-blue-200" /> : null}
              </div>
              <div className="mb-1 flex flex-1 flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${WHO_STYLE[step.who]}`}>{step.who}</span>
                    <span className="font-bold text-slate-900">{step.title}</span>
                  </div>
                  <p className="mt-1 text-sm leading-7 text-slate-600">{step.body}</p>
                </div>
                {step.href ? (
                  <Link
                    href={step.href as Route}
                    className="shrink-0 self-start rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-blue-800 hover:bg-blue-50 sm:self-center"
                  >
                    くわしく →
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="prepare" title="はじめる前にご確認ください">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>会社から届く招待メール</strong>（件名「【コレクレ】アカウント登録のご案内」）。ログインに使うメールアドレスと仮パスワードが書かれています。
          </li>
          <li>
            インターネットにつながる<strong>パソコン・スマートフォン・タブレット</strong>のいずれか。コレクレはアプリのインストール不要で、ブラウザから使えます。
          </li>
          <li>ブラウザは Google Chrome・Microsoft Edge・Safari の最新版をおすすめします。</li>
        </ul>
        <Callout kind="tip">
          <p>
            ログイン画面（<strong>https://app.correcre.jp/login</strong>）をブックマーク（お気に入り）やスマートフォンのホーム画面に追加しておくと、毎日の報告がすぐにできて便利です。
          </p>
        </Callout>
      </Section>

      <Section id="howto" title="この資料の読み方">
        <ul className="list-disc space-y-3 pl-6">
          <li>
            画面の画像にある<span className="mx-1 inline-block rounded border-2 border-rose-600 px-1.5 text-sm font-bold text-rose-600">赤い枠</span>
            は操作する場所、<Mark>1</Mark>
            <Mark>2</Mark>… の番号は操作する順番です。本文の番号と対応しています。
          </li>
          <li>
            <Ui>このような枠</Ui> で囲んだ文字は、画面に表示されているボタンや項目の名前です。
          </li>
          <li>画像はクリックすると大きく表示できます。画像はパソコンで表示したものですが、スマートフォンでも同じ内容が縦に並んで表示されます。</li>
          <li>
            <ChapterBadge>{EXCHANGE_BADGE}</ChapterBadge> と書かれた章は、<strong>ポイント交換の機能が有効になっている会社</strong>でだけ表示される画面です。
            メニューに <Ui>ポイント交換</Ui> が無い場合は、その章は読み飛ばしてかまいません。
          </li>
        </ul>
      </Section>

      <Section id="contents" title="目次">
        <div className="space-y-6">
          {DOCS_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-sm font-bold text-slate-500">{group.label}</div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {group.chapters.map((chapter) => {
                  chapterNumber += 1;
                  if (chapter.href === "/docs") return null;
                  return (
                    <Link
                      key={chapter.href}
                      href={chapter.href as Route}
                      className="group flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-300 hover:shadow-sm"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 group-hover:bg-blue-700 group-hover:text-white">
                        {chapterNumber}
                      </span>
                      <span>
                        <span className="block font-bold text-slate-900">
                          {chapter.title}
                          {chapter.badge ? (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{chapter.badge}</span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-sm text-slate-500">{chapter.summary}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-500">全 {DOCS_CHAPTERS.length - 1} 章です。</p>
      </Section>

      <PrevNext href="/docs" />
    </article>
  );
}
