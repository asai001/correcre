import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, StatusChip, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "予約が必要なサービス" };

const HREF = "/docs/reservation";

export default function ReservationDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            サロン・施術・体験など、<strong>お店に予約して利用するサービス</strong>の使いかたです。
            交換申請が承認されると、予約先と<strong>交換番号</strong>が案内されます。ご自身で予約をして、来店時に交換番号を伝えてください。
          </>
        }
        goals={["承認後に届く予約案内の見かた", "交換番号の伝えかた", "来店から完了までの流れ"]}
      />

      <Section id="flow" title="全体の流れ">
        <ol className="list-decimal space-y-2 pl-6">
          <li>商品の詳細画面で <Ui>ポイントで交換する</Ui> → <Ui>申請する</Ui>（<DocLink href="/docs/exchange#request">交換を申請する</DocLink>）。状態は <StatusChip status="申請中" /> です。</li>
          <li>提携企業（お店）が申請を承認すると、メール <strong>「【コレクレ】交換申請が承認されました。ご予約をお願いします」</strong> が届き、状態が <StatusChip status="準備中" /> になります。</li>
          <li>メールまたは画面の予約案内に沿って、<strong>ご自身でお店に予約</strong>します。予約時に<strong>交換番号</strong>を伝えます。</li>
          <li>予約した日にお店に行き、サービスを受けます。</li>
          <li>お店が利用を確認すると、状態が <StatusChip status="完了" /> になります。</li>
        </ol>
        <Callout kind="caution" title="承認される前に予約しないでください">
          <p>
            予約先と交換番号は、<strong>承認されてから</strong>画面とメールに表示されます。承認前の <StatusChip status="申請中" /> の間は、まだ予約をしないでください（在庫や予定の都合で却下される場合があります）。
          </p>
        </Callout>
      </Section>

      <Section id="open" title="予約案内を開く">
        <Shot name="reservation-banner" alt="ご予約とご来店をお願いしますのお知らせ。商品名と交換番号、予約案内を見るボタン" />
        <p>
          承認されると、ダッシュボードに黄色いお知らせ「ご予約とご来店をお願いします」が表示されます。<Mark>1</Mark> <Ui>予約案内を見る →</Ui> を押します。
          <DocLink href="/docs/exchange-history">交換履歴</DocLink> の「お届け日・予約」の列の <Ui>ご予約ください</Ui> からも開けます。
        </p>
        <Shot name="reservation-requested" alt="承認前の予約案内画面。承認待ちの説明だけが表示されている" maxWidth={720} />
        <p>承認前に開くと、上のように「承認待ちです」とだけ表示されます。承認されると、下の内容に変わります。</p>
      </Section>

      <Section id="reserve" title="予約する">
        <Shot name="reservation-detail" alt="ご予約のご案内画面。交換番号、予約ページを開くボタン、予約方法・注意事項" maxWidth={720} />
        <Steps>
          <Step number={1} title={<><Mark>1</Mark> 交換番号を控えます</>}>
            <p>
              <strong>COCR-</strong> から始まる番号が交換番号です。<Ui>コピー</Ui> を押すとコピーできます。お店はこの番号で、あなたの交換申請と予約を照合します。
            </p>
          </Step>
          <Step number={2} title={<><Mark>2</Mark> <Ui>予約ページを開く</Ui> を押して、お店の予約ページで予約します</>}>
            <p>
              予約ページは別のタブで開きます。ホットペッパービューティーの場合は、サロンのページが開いたら<strong>対象のメニューまたはクーポンを選んで</strong>予約してください。
              電話予約のお店では、予約ページの代わりに電話番号などが <Mark>3</Mark> <strong>予約方法・注意事項</strong> に書かれています。
            </p>
          </Step>
          <Step number={3} title={<><Mark>4</Mark> 予約のときに交換番号を伝えます</>}>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>ホットペッパービューティー</strong>：予約画面の「サロンからの質問」欄に交換番号を入力します。入力欄がない場合は、来店時に伝えてください。
              </li>
              <li>
                <strong>そのほかの予約サイト・電話</strong>：備考欄への記入、またはお電話・ご来店時に交換番号を伝えてください。
              </li>
            </ul>
          </Step>
        </Steps>
        <Callout kind="point" title="画面の「予約方法・注意事項」を必ず読んでください">
          <p>
            対象のメニュー名、予約できる曜日、持ち物、キャンセルの決まりなど、お店ごとの注意事項が書かれています。承認メールにも同じ内容が書かれています。
          </p>
        </Callout>
      </Section>

      <Section id="visit" title="来店から完了まで">
        <ul className="list-disc space-y-2 pl-6">
          <li>予約した日時にお店へ行き、受付で「コレクレの交換で予約した」ことと交換番号を伝えます。</li>
          <li>お店側でサービスの提供を確認すると、交換の状態が <StatusChip status="完了" /> になり、使ったポイントが確定します。あなたの操作は不要です。</li>
          <li>予約の変更・キャンセルは、お店の決まりに従って<strong>お店に直接</strong>連絡してください。</li>
        </ul>
        <Callout kind="info" title="交換自体をやめたいとき">
          <p>
            予約型のサービスは、画面からのキャンセルはできません。お店（提携企業）に事情を伝えてキャンセルを依頼してください。キャンセルされると、使ったポイントは全額戻ります。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
