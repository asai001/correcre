import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, SubSection, Ui } from "../_components/content";

export const metadata: Metadata = { title: "過去の実績を見る" };

const HREF = "/docs/past-performance";

const STATS = [
  ["獲得ポイント", "指定した期間に、ミッションの報告でもらったポイントの合計です。"],
  ["達成点数", "指定した期間の点数の合計です。1 か月だけを指定した場合は、その月の点数（満点 100 点）です。"],
  ["達成率 (%)", "期間中の満点に対して、何 % の点数を取れたかです。"],
  ["平均点数", "期間中の 1 か月あたりの平均点数です。"],
];

export default function PastPerformanceDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            月ごとの点数・達成率と、これまでの報告内容をふり返る画面です。<strong>得意なミッション・伸びしろのあるミッション</strong>も分かるので、
            来月の目標づくりに役立ててください。
          </>
        }
        goals={["表示する期間の変えかた", "数字・グラフ・項目分析の見かた", "報告内容の確認と、交換履歴の保存"]}
      />

      <Section id="open" title="画面を開く・期間を変える">
        <p>
          ダッシュボードの <Ui>過去の実績</Ui> のボタン、または上部メニューの <Ui>過去の実績</Ui> を押します。
        </p>
        <Shot name="past-performance" alt="過去の実績の画面全体" caption="過去の実績の全体（数字はサンプルです）" />
        <Shot name="past-performance-filter" alt="表示期間の開始月と終了月の選択" />
        <p>
          <Mark>1</Mark> <Ui>開始月</Ui> と <Mark>2</Mark> <Ui>終了月</Ui> を選ぶと、その期間の数字・グラフ・表がすべて切り替わります。
          最初は<strong>今月までの 7 か月</strong>（会社の利用開始が最近の場合は利用開始月から）が表示されています。
          1 か月だけを見たいときは、開始月と終了月を同じ月にします。
        </p>
      </Section>

      <Section id="stats" title="4 つの数字">
        <Shot name="past-performance-stats" alt="獲得ポイント、達成点数、達成率、平均点数のカード" />
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
        <Shot name="past-performance-charts" alt="達成割合のレーダーチャート、獲得点数推移の折れ線グラフ、項目分析" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Mark>1</Mark> <strong>達成割合（レーダーチャート）</strong>：ミッションごとに、上限回数に対して何 % 報告できたかを示します。外側に広がっているほど、まんべんなく取り組めています。
          </li>
          <li>
            <Mark>2</Mark> <strong>獲得点数推移</strong>：月ごとの点数の折れ線グラフです。
          </li>
          <li>
            <Mark>3</Mark> <strong>項目分析</strong>：達成率が高いミッションと、改善余地があるミッションが自動で分けて表示されます（分ける基準は会社が設定しています）。
          </li>
        </ul>
        <Callout kind="tip">
          <p>
            「改善余地がある項目」は、点数を伸ばしやすいミッションでもあります。来月は、ここに出ているミッションから意識してみるのがおすすめです。
          </p>
        </Callout>
      </Section>

      <Section id="reports" title="報告内容をふり返る">
        <Shot name="past-performance-reports" alt="報告内容の表。日付、項目名、進捗、入力内容" />
        <p>
          画面の一番下の<strong>報告内容</strong>には、期間中にあなたが送った報告が新しい順に並びます。「進捗」は、その報告が何回目だったか（例：3/20）です。
          画像を添付した報告では、入力内容の <Ui>アップロード写真</Ui> を押すと写真を見られます。
        </p>
        <Shot name="past-performance-image" alt="アップロード写真を開いたダイアログ" maxWidth={640} />
      </Section>

      <Section id="exchange" title="ポイント交換履歴を保存する">
        <SubSection title="CSV でダウンロード">
          <p>
            「ポイント交換履歴」には、期間中に申請した交換が表示されます。<Ui>データエクスポート</Ui> を押すと、表示中の期間の交換履歴が CSV ファイル（Excel などで開ける形式）としてダウンロードされます。
            取り消し線の付いたポイントは、却下・キャンセルで戻ってきたポイントです。
          </p>
        </SubSection>
        <p>
          交換の状態や、お届け日・予約の確認は <DocLink href="/docs/exchange-history">交換履歴を確認する</DocLink> をご覧ください。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
