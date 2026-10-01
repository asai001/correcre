import type { Metadata } from "next";

import { Callout, ChapterHeader, Mark, PrevNext, Section, Shot, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "収支・精算（請求）" };

const HREF = "/docs/settlement";

export default function SettlementDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            交換された商品の売上と、運用者へのご請求額を月ごとに確認する画面です。
            <strong>月が締まったら、この画面から請求メールを送信</strong>します。管理者のユーザーだけが開けます。
          </>
        }
        goals={["売上・手数料・請求額の見かた", "商品ごとの内訳の確認", "請求メールの送り方"]}
      />

      <Section id="screen" title="画面の見かた">
        <p>
          上部メニューの <Ui>収支・精算</Ui> を押すと、次の画面が開きます。
        </p>
        <Shot name="settlement" alt="収支・精算の画面。上に当月の売上・手数料・請求額、下に月ごとの収支の表" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-bold text-sky-700">売上</div>
            <p className="mt-1 text-sm leading-7">交換されたポイントを金額に換算したもの（1pt＝5円）。</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-bold text-rose-700">交換手数料</div>
            <p className="mt-1 text-sm leading-7">売上 × 手数料率（端数切り捨て）。手数料率は運用者が提携企業ごとに設定しています。</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-bold text-emerald-700">ご請求額</div>
            <p className="mt-1 text-sm leading-7">売上 − 交換手数料。運用者へ請求する金額です。</p>
          </div>
        </div>
        <p>
          下の「月ごとの収支」の表では、月ごとの交換件数・売上・手数料・請求額を確認できます。<strong>却下・キャンセルになった交換は含まれません。</strong>
        </p>
        <p>
          <Mark>1</Mark> 月の名前（▶ 2026年9月 など）を押すと、その月の<strong>商品・サービスごとの内訳</strong>が開きます。もう一度押すと閉じます。
        </p>
      </Section>

      <Section id="invoice" title="請求メールを送る">
        <Steps>
          <Step number={1} title="請求したい月の行を確認します">
            <p>
              請求は月単位です。<strong>今月分は月が終わるまで送信できません</strong>（「締め前のため送信不可」と表示されます）。
              月が変わったら、先月分を送信します。
            </p>
          </Step>
          <Step number={2} title={<>その月の行の右端にある <Mark>2</Mark> <Ui>請求メールを送信</Ui> を押します</>}>
            <p>「◯年◯月分の請求メールを運用者に送信します。よろしいですか？」と表示されるので <Ui>OK</Ui> を押します。</p>
          </Step>
          <Step number={3} title="送信できたことを確認します">
            <p>
              「◯年◯月分の請求メールを運用者に送信しました。」と表示され、ボタンが <Ui>送信済み</Ui> に変わります。
              送信済みの月は、もう一度送ることはできません。
            </p>
          </Step>
        </Steps>
        <Callout kind="tip">
          <p>先月分の請求メールをまだ送っていないと、ダッシュボードのやることリストに「◯月分の請求メールを送る」が表示されます。</p>
        </Callout>
        <Callout kind="info" title="お支払いについて">
          <p>
            売上が 0 円の月は送信できません。お支払いの時期・振込手数料などの条件は、「コレクレ アイテム提携企業向け規約」第8条をご確認ください。
            振込先は <Ui>会社情報</Ui> の画面で確認・変更できます。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
