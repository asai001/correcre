import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Ui } from "../_components/content";

export const metadata: Metadata = { title: "個人分析を見る" };

const HREF = "/docs/analysis-individual";

const STATS = [
  ["獲得ポイント", "期間中にその従業員が報告で獲得したポイントの合計です。"],
  ["達成点数", "期間中の点数の合計です。1 か月だけを指定した場合は、その月の点数（満点 100 点）です。"],
  ["達成率（%）", "期間中の満点に対して、何 % の点数を取れたかです。"],
  ["平均点数", "期間中の 1 か月あたりの平均点数です。"],
];

export default function AnalysisIndividualDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            <strong>個人分析</strong>では、従業員ひとりひとりの点数・達成率・報告内容・ポイント交換履歴を確認できます。
            面談や評価の場面で、本人の取り組みをふり返る材料として使えます。従業員本人も、従業員向けアプリの「過去の実績」で同じ内容を見られます。
          </>
        }
        goals={["従業員と期間の選びかた", "数字・グラフ・項目分析の見かた", "報告内容と交換履歴の確認"]}
      />

      <Section id="open" title="従業員と期間を選ぶ">
        <p>
          上部メニューの <Ui>分析・レポート</Ui> を開き、<Mark>1</Mark> <Ui>個人分析</Ui> のタブを押します。
        </p>
        <Shot name="analysis-individual" alt="個人分析の画面全体" caption="個人分析の全体（数字はサンプルです）" />
        <Shot name="analysis-individual-filter" alt="社員選択。社員を選択、開始月、終了月" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Mark>2</Mark> <Ui>社員を選択</Ui>：従業員を選びます。名前のあとに部署が表示されます。休止中・招待中の人は薄く表示され、選べません。
          </li>
          <li>
            <Mark>3</Mark> <Ui>開始月</Ui>・<Ui>終了月</Ui>：集計する期間です。1 か月だけを見たいときは、同じ月を選びます。
          </li>
        </ul>
        <p>選んだ従業員の名前と部署がカードに表示され、その下の内容がすべて切り替わります。</p>
      </Section>

      <Section id="stats" title="4 つの数字">
        <Shot name="analysis-individual-stats" alt="獲得ポイント、達成点数、達成率、平均点数のカード" />
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[480px] text-sm">
            <tbody className="leading-7">
              {STATS.map(([name, desc]) => (
                <tr key={name} className="border-t border-slate-100 first:border-t-0">
                  <th scope="row" className="w-40 px-4 py-2 text-left font-bold text-slate-900">{name}</th>
                  <td className="px-4 py-2 text-slate-700">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="charts" title="グラフ・項目分析・交換履歴">
        <Shot name="analysis-individual-charts" alt="達成割合のレーダーチャート、獲得点数推移、項目分析、ポイント交換履歴" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Mark>1</Mark> <strong>達成割合（レーダーチャート）</strong>：ミッションごとの達成率です。形が外側に広いほど、まんべんなく取り組めています。
          </li>
          <li>
            <Mark>2</Mark> <strong>獲得点数推移</strong>：月ごとの点数の折れ線グラフです。
          </li>
          <li>
            <Mark>3</Mark> <strong>項目分析</strong>：その人の達成率が高いミッションと、改善余地があるミッションです。
          </li>
          <li>
            <Mark>4</Mark> <strong>ポイント交換履歴</strong>：期間中に申請した交換です。取り消し線の付いたポイントは、却下・キャンセルで戻ったポイントです。<Ui>データエクスポート</Ui> で CSV に保存できます。
          </li>
        </ul>
      </Section>

      <Section id="reports" title="報告内容">
        <p>
          画面の一番下に、その従業員が期間中に送った<strong>報告内容</strong>が新しい順に表示されます。写真付きの報告は写真も確認でき、CSV / Excel に出力できます。
          くわしくは <DocLink href="/docs/reports">報告内容の確認とエクスポート</DocLink> をご覧ください。
        </p>
        <Callout kind="info" title="データが表示されないとき">
          <p>
            期間中に報告がない従業員は、数字が 0 でグラフも空になります。招待中（まだ初回ログインをしていない）の従業員は選択できません。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
