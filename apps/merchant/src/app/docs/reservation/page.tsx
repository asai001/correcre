import type { Metadata } from "next";

import {
  Callout,
  ChapterHeader,
  DocLink,
  FieldTable,
  PrevNext,
  Section,
  Shot,
  StatusChip,
  Step,
  Steps,
  Ui,
} from "../_components/content";

export const metadata: Metadata = { title: "予約が必要なサービス" };

const HREF = "/docs/reservation";

export default function ReservationDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            エステ・美容室・施術など、<strong>申請者に来店予約をしてもらう必要があるサービス</strong>の設定と対応方法です。
            予約はお店でお使いの予約サイトや電話で受け付け、コレクレでは「交換番号」で申請と予約を結び付けます。
          </>
        }
        goals={["商品登録での予約先の設定", "ホットペッパービューティーを使う場合の注意", "予約・来店・完了までの対応"]}
      />

      <Section id="setup" title="商品に予約先を設定する">
        <p>
          <DocLink href="/docs/merchandise#new">商品の登録画面</DocLink>の「予約のご案内（サロン・施術など）」で、
          <Ui>交換承認後に、申請者自身による予約が必要</Ui> のスイッチをオンにします。
        </p>
        <Shot name="merchandise-reservation-on" alt="予約のご案内をオンにした設定欄" />
        <FieldTable
          rows={[
            {
              name: "予約に使っているサービス",
              required: true,
              description: "「ホットペッパービューティー」か「その他（自社サイト・他の予約サービス・電話など）」を選びます。",
            },
            {
              name: "予約ページURL",
              description: (
                <>
                  ホットペッパービューティーの場合は<strong>サロンのトップページの URL</strong>を入力します（必須）。
                  その他の場合は予約ページの URL。電話予約だけなら空欄で構いません。
                </>
              ),
              example: "https://beauty.hotpepper.jp/slnH000000000/",
            },
            {
              name: "予約方法・注意事項",
              description: "予約してほしいメニュー・クーポンの名前や、電話番号などを書きます。URL を入れない場合は、こちらに必ず予約方法を書いてください。",
              example: "サロンページの「クーポン」から「コレクレ限定 フェイシャル60分」を選んでご予約ください。",
            },
          ]}
        />
        <Callout kind="caution" title="ホットペッパービューティーをお使いの場合">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              メニューやクーポン個別のページの URL は、申請者の環境によって予約エラーになることがあります。<strong>必ずサロンのトップページの URL</strong>を設定してください。
            </li>
            <li>
              予約と交換を照合できるよう、SALON BOARD の「サロンからの質問」に<strong>「コレクレの交換番号」を入力してもらう質問（必須）</strong>を追加してください。
            </li>
          </ul>
        </Callout>
      </Section>

      <Section id="flow" title="申請が届いてから完了するまで">
        <Steps>
          <Step number={1} title={<>交換申請を確認して <Ui>承認して準備に進める</Ui> を押します</>}>
            <Shot name="exchange-reservation-head" alt="予約が必要なサービスの交換詳細。交換番号 COCR-0012 が表示されている" />
            <p>
              予約が必要なサービスの申請には、<strong>交換番号</strong>（例：COCR-0012）が付いています。交換管理の一覧にも表示されます。
            </p>
            <p>
              承認すると、設定した予約先と交換番号が<strong>申請者へ自動でメール案内</strong>されます。あなたから予約先を連絡する必要はありません。
            </p>
          </Step>
          <Step number={2} title="申請者が予約サイト・電話で予約します">
            <p>
              申請者は、予約時に交換番号をお店に伝えます（ホットペッパービューティーでは「サロンからの質問」欄に入力）。
              予約の管理は、いつもお使いの予約サイト・台帳で行ってください。
            </p>
          </Step>
          <Step number={3} title="ご来店時に交換番号を確認し、サービスを提供します">
            <p>
              交換番号から、交換管理の一覧で該当の申請を探せます。サービスを始めるときに <Ui>対応を開始する</Ui> を押すと
              <StatusChip status="対応中" /> になります。
            </p>
          </Step>
          <Step number={4} title={<>サービスの提供が済んだら <Ui>完了にする</Ui> を押します</>}>
            <p>ポイントの支払いが確定し、売上として集計されます。</p>
          </Step>
        </Steps>
        <Shot name="exchange-reservation" alt="予約が必要なサービスの交換詳細画面の全体。予約についての案内が表示されている" caption="予約が必要なサービスの交換詳細には、青い枠で予約の運用の案内が表示されます。" />
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
