import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "報告内容の確認とエクスポート" };

const HREF = "/docs/reports";

export default function ReportsDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            従業員がミッションを報告すると、その内容は<strong>報告内容</strong>の表に表示されます。ダッシュボードでは全員の直近の報告を、個人分析では選んだ従業員の報告を確認できます。
            写真付きの報告の写真を見たり、期間を指定して CSV / Excel に出力したりできます。
          </>
        }
        goals={["報告内容の表の見かた", "添付された写真の見かた", "CSV / Excel へのエクスポート"]}
      />

      <Section id="table" title="表の見かた">
        <Shot name="reports-table" alt="報告内容の表。日付、社員名、項目名、進捗、入力内容、データエクスポートボタン" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>日付</strong>：報告が送られた日時です。
          </li>
          <li>
            <strong>社員名</strong>：報告した従業員です（個人分析では、選んだ従業員の報告だけなので表示されません）。
          </li>
          <li>
            <strong>項目名</strong>：報告したミッションの名前です。
          </li>
          <li>
            <strong>進捗</strong>：その月の何回目の報告かです（例：3/20 は、上限 20 回のうち 3 回目）。
          </li>
          <li>
            <strong>入力内容</strong>：従業員が入力した内容です。項目名と入力値が並びます。写真を添付した報告は <Ui>アップロード写真</Ui> と表示されます。
          </li>
        </ul>
        <p>
          表の下の <Ui>表示件数</Ui> で 1 ページあたりの件数を変えられ、矢印でページを移動できます。
        </p>
      </Section>

      <Section id="image" title="添付された写真を見る">
        <p>
          入力内容の <Mark>1</Mark> <Ui>アップロード写真</Ui> を押すと、写真が大きく表示されます。右上の ✕ で閉じます。
        </p>
        <Shot name="reports-image" alt="アップロード写真を開いたダイアログ" maxWidth={720} />
        <Callout kind="info">
          <p>
            写真は、報告した従業員・管理者・運用者だけが見られます。エクスポートした CSV / Excel には、写真そのものは含まれず「アップロード写真」という文字で記録されます。
          </p>
        </Callout>
      </Section>

      <Section id="export" title="CSV / Excel にエクスポートする">
        <Steps>
          <Step number={1} title={<>報告内容の右上の <Ui>データエクスポート</Ui> を押します</>} />
          <Step number={2} title="期間とファイル形式を選びます">
            <Shot name="reports-export" alt="報告内容のエクスポートのダイアログ。開始月、終了月、ファイル形式" maxWidth={480} />
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <Mark>1</Mark> <Ui>開始月</Ui>・<Ui>終了月</Ui>：出力する期間です。画面に表示している件数に関係なく、<strong>期間中のすべての報告</strong>が出力されます。
              </li>
              <li>
                <Mark>2</Mark> <Ui>ファイル形式</Ui>：<strong>CSV (.csv)</strong> か <strong>Excel (.xlsx)</strong> を選びます。Excel で開くことが多い場合は Excel 形式がおすすめです（文字化けしません）。
              </li>
            </ul>
          </Step>
          <Step number={3} title={<><Mark>3</Mark> <Ui>エクスポート</Ui> を押します</>}>
            <p>
              ファイルがダウンロードされます。期間中に報告が 1 件もない場合は「指定した期間に対象のデータがありません。」と表示されます。
              件数が多いと時間がかかることがあります。<Ui>キャンセル</Ui> で中断できます。
            </p>
          </Step>
        </Steps>
        <Callout kind="tip" title="月次の確認に">
          <p>
            月初めに前月分をエクスポートしておくと、朝礼での紹介や、評価面談の資料づくりに使えます。
            個人分析から出力すると、その従業員だけの報告をまとめられます（<DocLink href="/docs/analysis-individual">個人分析を見る</DocLink>）。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
