import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, PrevNext, Section, Shot, Ui } from "../_components/content";

export const metadata: Metadata = { title: "ポイントのたまり方と使いかた" };

const HREF = "/docs/points";

const TIMELINE = [
  { when: "月の途中", what: "ミッションを報告するたびに点数がもらえます。点数に応じたポイントは「翌月反映予定」にたまっていきます。" },
  { when: "月末", what: "その月の点数が確定します。ダッシュボードの「今月の獲得点数」が、その月の合計点です。" },
  { when: "翌月 1 日", what: "「翌月反映予定」だったポイントが「現在の保有ポイント」に加わり、交換に使えるようになります。" },
];

export default function PointsDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            ミッションの報告でもらえる<strong>点数</strong>と、商品と交換できる<strong>ポイント</strong>は別のものです。
            この章では、点数がどうポイントになり、いつから使えるようになるかを説明します。
          </>
        }
        goals={["点数とポイントの違い", "ポイントが使えるようになるタイミング（翌月反映）", "ポイントの使い道"]}
      />

      <Section id="score-vs-point" title="点数とポイントの違い">
        <Shot name="dashboard-summary" alt="今月の獲得点数、現在の保有ポイント、翌月反映予定、先月の獲得ポイントの4枚のカード" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="text-lg font-bold text-blue-900">点数（点）</div>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              ミッションを報告するともらえる「がんばりの評価」です。1 か月の満点は <strong>100 点</strong>で、月が変わると 0 点から数え直します。
              達成率やグラフは、この点数で計算されます。
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="text-lg font-bold text-amber-900">ポイント（pt）</div>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              商品・サービスと交換できる「ご褒美」です。<strong>1 ポイント ＝ 5 円</strong>相当で、使わなければ翌月以降に持ち越されます。
              点数に応じて、会社ごとに決められた割合でポイントに変わります。
            </p>
          </div>
        </div>
        <Callout kind="point" title="ポイントへの換算">
          <p>
            1 か月に満点（100 点）を取ると、会社がコレクレに支払っている 1 人あたりの月額分（例：1,000 円なら <strong>200 ポイント</strong>）がまるごとポイントになります。
            50 点なら半分の 100 ポイント、という具合に点数に比例します。実際の換算の割合は会社の契約によって異なりますので、気になる場合は会社の管理者にご確認ください。
          </p>
        </Callout>
      </Section>

      <Section id="timing" title="ポイントが使えるようになるタイミング">
        <ol className="space-y-3">
          {TIMELINE.map((item, index) => (
            <li key={item.when} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">{index + 1}</div>
                {index < TIMELINE.length - 1 ? <div aria-hidden className="mt-1 w-0.5 flex-1 bg-blue-200" /> : null}
              </div>
              <div className="mb-1 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="font-bold text-slate-900">{item.when}</div>
                <p className="mt-1 text-sm leading-7 text-slate-600">{item.what}</p>
              </div>
            </li>
          ))}
        </ol>
        <Callout kind="caution" title="今月の報告分は、今月は使えません">
          <p>
            今月のミッションでもらったポイントは「<strong>翌月反映予定</strong>」に入り、翌月 1 日まで交換には使えません。
            「現在の保有ポイント」だけが交換に使えるポイントです。
          </p>
        </Callout>
      </Section>

      <Section id="use" title="ポイントの使い道">
        <p>
          たまったポイントは、提携企業の<strong>商品・サービスとの交換</strong>に使えます。食品・日用品・美容サービスなど、提携企業が登録したものの中から選べます。
          使いかたは <DocLink href="/docs/exchange">商品・サービスと交換する</DocLink> をご覧ください。
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>交換を申請した時点で、必要ポイントが「現在の保有ポイント」から引かれます。</li>
          <li>申請が却下されたり、キャンセルしたりした場合は、ポイントは<strong>全額戻ります</strong>。</li>
          <li>ポイントが足りない商品は、商品の画面に「ポイント残高が不足しています」と表示され、申請できません。</li>
        </ul>
        <Callout kind="info" title="メニューに「ポイント交換」が無い場合">
          <p>
            ポイント交換の機能は、会社の設定で有効になっている場合だけ使えます。ダッシュボードに <Ui>ポイント交換</Ui> のボタンが無い場合は、会社の管理者にご確認ください。
          </p>
        </Callout>
        <Callout kind="info" title="管理者によるポイントの調整">
          <p>
            会社の管理者は、必要に応じてあなたのポイントを増減することがあります（特別な表彰や、誤って付与されたポイントの修正など）。
            ポイントの増減について不明な点は、会社の管理者にご確認ください。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
