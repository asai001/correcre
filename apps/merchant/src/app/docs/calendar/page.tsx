import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Ui } from "../_components/content";

export const metadata: Metadata = { title: "休業日カレンダー" };

const HREF = "/docs/calendar";

export default function CalendarDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            お店の定休日や、年末年始・出張などで発送できない日を登録しておく画面です。
            登録した日は、<DocLink href="/docs/delivery-schedule">お届け日の候補</DocLink>を自動で作るときに外れるので、毎回手で候補を外す手間がなくなります。
          </>
        }
        goals={["臨時休業日の登録・解除", "連休をまとめて登録する方法", "定休日・祝日の設定"]}
      />

      <Section id="screen" title="画面の使い方">
        <p>
          上部メニューの <Ui>休業日カレンダー</Ui> を押すと、次の画面が開きます。
        </p>
        <Shot name="calendar" alt="休業日カレンダーの画面。番号1から5で操作箇所が示されている" />
        <ol className="space-y-4">
          <li>
            <Mark>1</Mark> <strong>臨時休業日を登録する</strong>：カレンダーの日付を押すと、ピンク色（臨時休業）になります。もう一度押すと解除されます。
            右上の <Ui>&lt;</Ui> <Ui>&gt;</Ui> で前の月・次の月に移動できます。
          </li>
          <li>
            <Mark>2</Mark> <strong>連休をまとめて登録する</strong>：開始日と終了日を選んで <Ui>期間を追加</Ui> を押すと、その間の日がすべて臨時休業になります。年末年始などに便利です。
          </li>
          <li>
            <Mark>3</Mark> <strong>定休日（毎週）</strong>：毎週お休みの曜日にチェックを入れます。カレンダーでは点線の枠で表示されます。
          </li>
          <li>
            <Mark>4</Mark> <strong>祝日の扱い</strong>：オンにすると、日本の祝日を休業日として扱います（カレンダーでは黄色）。祝日も営業する場合はオフにしてください。
          </li>
          <li>
            <Mark>5</Mark> <strong>最後に必ず <Ui>保存する</Ui> を押します。</strong>押さないと設定は反映されません。
          </li>
        </ol>
        <p>「休業日カレンダーを保存しました。」と緑色で表示されれば完了です。</p>
        <Callout kind="caution">
          <p>
            保存した設定は、<strong>これから作られる候補日</strong>に反映されます。すでに申請者へ提示済みの候補日や、確定済みのお届け日は変わりません。
          </p>
        </Callout>
        <Callout kind="tip">
          <p>
            お届け日の調整がある商品を公開しているのに休業日が 1 日も登録されていないと、ダッシュボードのやることリストに「お休みの日を登録する」が表示されます。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
