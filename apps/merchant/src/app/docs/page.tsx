import Link from "next/link";
import type { Metadata, Route } from "next";

import { AdminOnlyBadge, Callout, ChapterHeader, Mark, PrevNext, Section, Ui } from "./_components/content";
import { DOCS_CHAPTERS, DOCS_GROUPS } from "./_components/docs-nav";

export const metadata: Metadata = {
  title: { absolute: "提携企業向け 操作ガイド | コレクレ" },
};

const FLOW = [
  { who: "あなた", title: "登録申請", body: "Web の申込フォームに会社情報を入力して送信します。", href: "/docs/register" },
  { who: "運用者", title: "審査", body: "コレクレ運営が内容を確認します。結果はメールでお知らせします。" },
  { who: "あなた", title: "初回ログイン", body: "届いた招待メールの仮パスワードでログインし、新しいパスワードを決めます。", href: "/docs/first-login" },
  { who: "あなた", title: "商品・サービスを登録", body: "掲載したい商品を登録して「公開」すると、申請者の画面に並びます。", href: "/docs/merchandise" },
  { who: "申請者", title: "交換申請が届く", body: "申請者がポイントで商品を選ぶと、あなたにメールでお知らせが届きます。" },
  { who: "あなた", title: "承認 → 発送 → 完了", body: "画面のボタンで状態を進めながら、商品をお届けします。", href: "/docs/exchanges" },
  { who: "あなた", title: "月に一度の請求", body: "月が締まったら、収支・精算の画面から請求メールを送ります。", href: "/docs/settlement" },
];

const WHO_STYLE: Record<string, string> = {
  あなた: "bg-teal-700 text-white",
  運用者: "bg-slate-700 text-white",
  申請者: "bg-amber-500 text-white",
};

export default function DocsTopPage() {
  let chapterNumber = -1;

  return (
    <article>
      <ChapterHeader
        href="/docs"
        lead={
          <>
            この資料は、コレクレに商品・サービスを掲載していただく<strong>提携企業の担当者さま向け</strong>の操作ガイドです。
            はじめての方でも迷わないよう、<strong>登録の申し込みから毎日の操作まで</strong>を、実際の画面の画像を使って順番に説明します。
          </>
        }
        goals={["コレクレがどんな仕組みか", "ご利用開始までに何をすればよいか", "この資料の読み方"]}
      />

      <Section id="about" title="コレクレとは">
        <p>
          コレクレは、会社が社員の「理念に沿った良い行動」を評価して<strong>ポイント</strong>を贈る仕組みです。
          社員はたまったポイントを使って、提携企業さまの<strong>商品・サービスと交換</strong>できます。
        </p>
        <p>提携企業さまにとっては、コレクレに商品を掲載し、交換された分が売上になる、という関係です。</p>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { who: "申請者", desc: "コレクレを導入している会社の社員さん。ポイントで商品を選び「交換申請」をします。" },
            { who: "あなた", desc: "提携企業さま。商品を登録し、交換申請に対応して商品・サービスをお届けします。" },
            { who: "運用者", desc: "コレクレの運営（em株式会社）。登録の審査や、請求・お問い合わせの窓口です。" },
          ].map((item) => (
            <div key={item.who} className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${WHO_STYLE[item.who]}`}>
                {item.who === "あなた" ? "提携企業（あなた）" : item.who}
              </span>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>

        <Callout kind="point" title="ポイントと金額の関係">
          <p>
            <strong>1 ポイント ＝ 5 円</strong>です。商品を登録するときに価格を入力すると、交換に必要なポイント数が自動で計算されます
            （例：価格 4,150 円 → 830 ポイント）。
          </p>
        </Callout>
      </Section>

      <Section id="flow" title="ご利用開始から精算までの流れ">
        <p>全体の流れは次のとおりです。各ステップの詳しいやり方は、右端の「くわしく」から確認できます。</p>
        <ol className="space-y-3">
          {FLOW.map((step, index) => (
            <li key={step.title} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-base font-bold text-white">
                  {index + 1}
                </div>
                {index < FLOW.length - 1 ? <div aria-hidden className="mt-1 w-0.5 flex-1 bg-teal-200" /> : null}
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
                    className="shrink-0 self-start rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-50 sm:self-center"
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
            <strong>担当者さまのメールアドレス</strong>（ログインに使います。お知らせメールもここに届きます）
          </li>
          <li>会社の所在地・電話番号など、会社の基本情報</li>
          <li>（あれば）売上の振込先口座</li>
          <li>
            掲載する商品・サービスの<strong>説明文・価格・写真</strong>（写真は JPEG / PNG / WebP 形式、1 枚 10MB まで）
          </li>
        </ul>
        <Callout kind="tip">
          <p>
            操作は<strong>パソコン</strong>での利用をおすすめします。ブラウザは Google Chrome・Microsoft Edge・Safari の最新版をお使いください。
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
            <AdminOnlyBadge /> と書かれた章は、<strong>管理者</strong>のユーザーにだけ表示される画面です（登録申請をした方は管理者になります）。
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
                      className="group flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-teal-300 hover:shadow-sm"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 group-hover:bg-teal-700 group-hover:text-white">
                        {chapterNumber}
                      </span>
                      <span>
                        <span className="block font-bold text-slate-900">
                          {chapter.title}
                          {chapter.adminOnly ? (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">管理者</span>
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
