import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Ui } from "../_components/content";

export const metadata: Metadata = { title: "全体分析を見る" };

const HREF = "/docs/analysis-overall";

const STATS = [
  ["平均獲得点数", "期間中の、従業員 1 人・1 か月あたりの平均点数です（満点 100 点）。"],
  ["総獲得ポイント", "期間中に従業員全員が報告で獲得したポイントの合計です。"],
  ["使用済みポイント", "期間中に従業員がポイント交換で使ったポイントの合計です。"],
];

export default function AnalysisOverallDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            <strong>分析・レポート</strong>の「全体分析」では、会社全体または部署ごとの達成状況を、期間を指定して確認できます。
            どのミッションが浸透していて、どのミッションに改善の余地があるかを把握するのに使います。
          </>
        }
        goals={["分析条件（部署・期間）の指定", "数字・グラフ・項目分析の見かた", "ポイント交換履歴の確認と保存"]}
      />

      <Section id="open" title="画面を開く・条件を指定する">
        <p>
          上部メニューの <Ui>分析・レポート</Ui> を開きます。最初に<strong>全体分析</strong>のタブが表示されています（<Mark>1</Mark> で個人分析に切り替えられます）。
        </p>
        <Shot name="analysis-overall" alt="全体分析の画面全体" caption="全体分析の全体（数字はサンプルです）" />
        <Shot name="analysis-overall-filter" alt="分析条件設定。部署、開始月、終了月" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Mark>2</Mark> <Ui>部署</Ui>：「すべての部署」か、特定の部署を選びます。部署が未設定の従業員がいる場合は「部門未設定」も選べます。
          </li>
          <li>
            <Mark>3</Mark> <Ui>開始月</Ui>・<Ui>終了月</Ui>：集計する期間です。最初は今月までの 7 か月（利用開始が最近の場合は利用開始月から）になっています。
          </li>
        </ul>
        <p>条件を変えると、下の数字・グラフ・表がすべて切り替わります。</p>
      </Section>

      <Section id="stats" title="3 つの数字">
        <Shot name="analysis-overall-stats" alt="平均獲得点数、総獲得ポイント、使用済みポイントのカード" />
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

      <Section id="charts" title="グラフと項目分析">
        <Shot name="analysis-overall-charts" alt="各項目達成割合の棒グラフ、項目分析、平均得点推移の折れ線グラフ" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Mark>1</Mark> <strong>各項目達成割合</strong>：ミッションごとに、上限回数の何 % まで報告されたかの平均です。
          </li>
          <li>
            <Mark>2</Mark> <strong>項目分析</strong>：達成率が高いミッションと、改善余地があるミッションを自動で分けて表示します。分ける基準（%）は運用者が会社ごと・ミッションごとに設定しています（標準では 80% 以上 / 40% 未満）。
          </li>
          <li>
            <Mark>3</Mark> <strong>平均得点推移</strong>：月ごとの平均点数の折れ線グラフです。取り組みが定着してきたか、落ちてきたかの傾向が分かります。
          </li>
        </ul>
        <Callout kind="tip" title="活用のヒント">
          <ul className="list-disc space-y-1 pl-5">
            <li>「改善余地がある項目」が続くミッションは、内容や回数が現場に合っていない可能性があります。運用者に相談して、翌月からの見直しを検討してください。</li>
            <li>部署ごとに切り替えて比べると、部署による取り組みの差が分かります。朝礼などでの声かけの材料になります。</li>
          </ul>
        </Callout>
      </Section>

      <Section id="exchange" title="ポイント交換履歴">
        <Shot name="analysis-overall-exchange" alt="ポイント交換履歴の表とデータエクスポートボタン" />
        <p>
          期間中に従業員がポイント交換を申請した履歴が、日時・従業員名・交換商品・使用ポイントの順に表示されます。
          <Ui>データエクスポート</Ui> を押すと、表示中の期間の履歴を CSV ファイルとして保存できます。
        </p>
        <p>
          従業員ひとりひとりの状況は、<DocLink href="/docs/analysis-individual">個人分析を見る</DocLink> をご覧ください。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
