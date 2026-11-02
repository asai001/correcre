import Link from "next/link";
import type { Metadata, Route } from "next";

import { Callout, ChapterHeader, Mark, PrevNext, Section, Ui } from "./_components/content";
import { DOCS_CHAPTERS, DOCS_GROUPS } from "./_components/docs-nav";

export const metadata: Metadata = {
  title: { absolute: "管理者向け 操作ガイド | コレクレ" },
};

const FLOW = [
  { who: "運用者", title: "会社とミッションの登録", body: "コレクレ運営（運用者）が、打ち合わせで決めた理念体系とミッション（評価項目）を登録し、管理者のアカウントを発行します。" },
  { who: "あなた", title: "初回ログイン", body: "届いた招待メールの仮パスワードでログインし、新しいパスワードを決めます。", href: "/docs/first-login" },
  { who: "あなた", title: "部署と従業員を登録", body: "部署を作り、従業員を登録します。登録した従業員には招待メールが自動で届きます。", href: "/docs/users" },
  { who: "従業員", title: "ミッションを報告", body: "従業員が従業員向けアプリでミッションを報告し、点数とポイントを獲得します。" },
  { who: "あなた", title: "状況を確認する", body: "ダッシュボードと分析・レポートで、全社・部署・個人の達成状況と報告内容を確認します。", href: "/docs/analysis-overall" },
  { who: "あなた", title: "月に一度の確認", body: "請求情報で当月の利用料を確認し、必要に応じて請求書をダウンロードします。", href: "/docs/billing" },
];

const WHO_STYLE: Record<string, string> = {
  あなた: "bg-indigo-700 text-white",
  運用者: "bg-slate-700 text-white",
  従業員: "bg-amber-500 text-white",
};

export default function DocsTopPage() {
  let chapterNumber = -1;

  return (
    <article>
      <ChapterHeader
        href="/docs"
        lead={
          <>
            この資料は、コレクレを導入した会社の<strong>管理者さま向け</strong>の操作ガイドです。
            はじめての方でも迷わないよう、<strong>最初のログインから、従業員の登録・日々の状況確認・請求の確認まで</strong>を、実際の画面の画像を使って順番に説明します。
          </>
        }
        goals={["コレクレがどんな仕組みか", "管理者がすること", "この資料の読み方"]}
      />

      <Section id="about" title="コレクレとは">
        <p>
          コレクレは、会社の理念に沿った「良い行動」を<strong>ミッション</strong>として見える化し、実行した従業員に<strong>点数</strong>を贈る仕組みです。
          点数は<strong>ポイント</strong>に変わり、従業員はたまったポイントで提携企業の商品・サービスと交換できます。
        </p>
        <p>管理者さまは、従業員の登録と、みなさんの取り組み状況の確認、理念・会社情報の管理を行います。</p>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { who: "あなた", desc: "導入企業の管理者。従業員の登録、部署の管理、達成状況の確認、理念・会社情報の管理を行います。" },
            { who: "従業員", desc: "従業員向けアプリ（app.correcre.jp）でミッションを報告し、ポイントを商品と交換します。" },
            { who: "運用者", desc: "コレクレの運営（em株式会社）。会社・ミッションの登録、請求、お問い合わせの窓口です。" },
          ].map((item) => (
            <div key={item.who} className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${WHO_STYLE[item.who]}`}>
                {item.who === "あなた" ? "管理者（あなた）" : item.who}
              </span>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>

        <Callout kind="point" title="点数とポイントの関係">
          <p>
            従業員がミッションを報告すると、ミッションごとに決められた<strong>点数</strong>がもらえます（1 か月の満点は 100 点）。
            月末の点数に応じて、1 人あたりの月額利用料（ID 料金）分を上限にポイントへ換算され、<strong>翌月 1 日</strong>に従業員の使えるポイントになります。
            <strong>1 ポイント ＝ 5 円</strong>相当です（例：ID 料金 1,000 円で満点なら 200 ポイント）。
          </p>
        </Callout>
      </Section>

      <Section id="flow" title="導入から運用までの流れ">
        <p>全体の流れは次のとおりです。各ステップの詳しいやり方は、右端の「くわしく」から確認できます。</p>
        <ol className="space-y-3">
          {FLOW.map((step, index) => (
            <li key={step.title} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-700 text-base font-bold text-white">
                  {index + 1}
                </div>
                {index < FLOW.length - 1 ? <div aria-hidden className="mt-1 w-0.5 flex-1 bg-indigo-200" /> : null}
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
                    className="shrink-0 self-start rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-50 sm:self-center"
                  >
                    くわしく →
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="prepare" title="はじめる前にご用意いただくもの">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>運用者から届く招待メール</strong>（件名「【コレクレ】アカウント登録のご案内」）。ログインに使うメールアドレスと仮パスワードが書かれています。
          </li>
          <li>
            従業員の<strong>氏名・フリガナ・メールアドレス・所属部署</strong>の一覧。登録のときに入力します。
          </li>
          <li>（あれば）会社の住所、代表者・担当者の連絡先。各種情報画面で登録します。</li>
        </ul>
        <Callout kind="tip">
          <p>
            操作は<strong>パソコン</strong>での利用をおすすめします。ブラウザは Google Chrome・Microsoft Edge・Safari の最新版をお使いください。
            管理者向けアプリのログイン画面は <strong>https://admin.correcre.jp/login</strong> です。
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
          <li>画像はクリックすると大きく表示できます。</li>
          <li>
            この資料で「<strong>運用者</strong>」と書いているのは、コレクレの運営（em株式会社）のことです。「<strong>管理者</strong>」は、あなたを含む導入企業側の管理者です。
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
                      className="group flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-indigo-300 hover:shadow-sm"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 group-hover:bg-indigo-700 group-hover:text-white">
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
