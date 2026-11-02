import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, StatusChip, Step, Steps, SubSection, Ui } from "../_components/content";

export const metadata: Metadata = { title: "商品・サービスと交換する" };

const HREF = "/docs/exchange";

const FILTERS = [
  ["キーワード検索", "商品名・会社名・説明文に含まれる言葉で探します。"],
  ["ジャンル", "食品 ／ 健康・美容 ／ 日用品・生活雑貨 ／ 服飾 ／ 記念 など。"],
  ["提供方法", "発送・来店・出張・オンライン のどれで受け取る商品かで絞り込みます。"],
  ["対応エリア", "来店や訪問が必要なサービスで、対応している地域を選びます。"],
  ["ポイント帯", "500pt 未満・500〜1,000pt など、必要ポイントの範囲で絞り込みます。"],
];

export default function ExchangeDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            たまったポイントで、提携企業の商品・サービスと交換する手順です。商品を探し、内容を確認して<strong>交換申請</strong>をすると、
            提携企業が確認したうえで商品をお届け（またはサービスを提供）します。
          </>
        }
        goals={["商品の探しかた（絞り込み・並べ替え・お気に入り）", "商品の詳しい内容の見かた", "交換申請の手順と、申請前に必要な登録"]}
      />

      <Section id="open" title="商品・サービスの一覧を開く">
        <p>
          ダッシュボードの <Ui>ポイント交換</Ui> のボタン、または画面上部のメニューの <Ui>ポイント交換</Ui> を押します。
        </p>
        <Shot name="exchange-header" alt="商品・サービス交換画面の上部。保有ポイントと翌月反映予定、メニュー" />
        <p>
          画面の右上 <Mark>1</Mark> に、いま使える<strong>保有ポイント</strong>と、翌月反映予定のポイントが表示されます。交換に使えるのは保有ポイントだけです。
        </p>
        <Shot name="exchange-list" alt="商品・サービスの一覧画面の全体" caption="一覧画面の全体（商品はサンプルです）" />
      </Section>

      <Section id="find" title="商品を探す">
        <SubSection title="注目商品">
          <Shot name="exchange-pickup" alt="画面上部の注目商品のバナー" />
          <p>
            一番上には、おすすめの商品が順番に表示されます。<Ui>注目商品を見る</Ui> を押すと人気順に、<Ui>新着を確認</Ui> を押すと新着順に一覧が並び替わります。
          </p>
        </SubSection>
        <SubSection title="条件で絞り込む">
          <Shot name="exchange-filter" alt="絞り込みの入力欄と、この条件で検索ボタン" />
          <p>
            <Mark>1</Mark> の欄に条件を入れて <Mark>2</Mark> <Ui>この条件で検索</Ui> を押すと、条件に合う商品だけが表示されます。<Ui>条件をリセット</Ui> で元に戻ります。
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[480px] text-sm">
              <tbody className="leading-7">
                {FILTERS.map(([name, desc]) => (
                  <tr key={name} className="border-t border-slate-100 first:border-t-0">
                    <th scope="row" className="w-40 px-4 py-2 text-left font-bold text-slate-900">
                      {name}
                    </th>
                    <td className="px-4 py-2 text-slate-700">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SubSection>
        <SubSection title="並べ替えと、お気に入り">
          <Shot name="exchange-sort" alt="人気順・新着順・ポイントが低い順の並べ替えと、お気に入りのみボタン、件数表示" />
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <Mark>1</Mark> <Ui>人気順</Ui>・<Ui>新着順</Ui>・<Ui>ポイントが低い順</Ui> で並べ替えられます。
            </li>
            <li>
              <Mark>2</Mark> 商品カードの右上の<strong>ハートのマーク</strong>を押すと、お気に入りに登録できます（もう一度押すと解除）。<Ui>お気に入りのみ</Ui> を押すと、お気に入りの商品だけが表示されます。
            </li>
            <li>
              <Mark>3</Mark> 右端に件数が表示されます。1 ページに 12 件ずつ表示され、下の <Ui>前へ</Ui>・<Ui>次へ</Ui> でページを移動します。
            </li>
          </ul>
        </SubSection>
        <SubSection title="商品カードの見かた">
          <Shot name="exchange-card" alt="商品カードの例" maxWidth={420} />
          <p>
            カードには、商品名・提供する会社名・提供方法・対応エリア・ジャンルと、交換に必要なポイントが書かれています。
            カードのどこかを押すと、商品の詳しい内容の画面が開きます。
          </p>
        </SubSection>
      </Section>

      <Section id="detail" title="商品の詳しい内容を見る">
        <Shot name="exchange-detail" alt="商品の詳細画面の全体" caption="商品詳細画面の全体" />
        <Shot name="exchange-detail-action" alt="商品名、必要ポイント、説明文と、ポイントで交換するボタン" />
        <p>
          <Mark>1</Mark> に商品名・必要ポイント・説明文が表示されます。<Mark>2</Mark> <Ui>ポイントで交換する</Ui> を押すと申請に進みます。
          保有ポイントが足りない場合は、ボタンが押せなくなり「ポイント残高が不足しています（不足 ◯pt）」と表示されます。
          <Mark>3</Mark> のハートでお気に入りに登録できます。
        </p>
        <Shot name="exchange-detail-info" alt="商品詳細情報の表。必要ポイント数、対応エリア、提供タイプ、ジャンル、内容量、賞味期限、お届け予定、注意事項など" />
        <p>
          下の<strong>商品詳細情報</strong>には、内容量・賞味期限・お届け予定・注意事項などが書かれています。申請の前に必ず目を通してください。特に次の 2 つにご注意ください。
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>お届け日</strong>の欄に「交換申請後に、提示される候補からお届け日を選択します」とある商品は、申請のあとで<strong>あなたがお届け日を選ぶ</strong>必要があります（<DocLink href="/docs/delivery-schedule">お届け日を選ぶ・受け取る</DocLink>）。
          </li>
          <li>
            <strong>ご予約</strong>の欄に「ご自身での予約が必要です」とある商品は、承認後に<strong>あなたが店舗に予約</strong>をします（<DocLink href="/docs/reservation">予約が必要なサービス</DocLink>）。
          </li>
        </ul>
        <p>
          画面の一番下には「その他の商品一覧」として、ほかの商品も表示されます。<Ui>一覧へ戻る</Ui> で一覧に戻れます。
        </p>
      </Section>

      <Section id="request" title="交換を申請する">
        <Steps>
          <Step number={1} title={<>商品の詳細画面で <Ui>ポイントで交換する</Ui> を押します</>}>
            <p>「交換申請の確認」の画面が開きます。</p>
          </Step>
          <Step number={2} title="内容と、お届け先・連絡先を確認します">
            <Shot name="exchange-confirm" alt="交換申請の確認ダイアログ。商品名、必要ポイント、申請後の残高、お届け先・連絡先、申請するボタン" maxWidth={640} />
            <p>
              <Mark>1</Mark> に商品名・必要ポイント・<strong>申請後の残高</strong>が表示されます。
              <Mark>2</Mark> の<strong>お届け先・連絡先</strong>は、提携企業が商品を送ったり連絡したりするために使われます。内容が古い場合は <Ui>編集</Ui> から直してください。
            </p>
            <Callout kind="caution" title="住所と電話番号が登録されていないと申請できません">
              <p>
                郵便番号・都道府県・市区町村・丁目/番地・電話番号のどれかが未登録だと、赤い注意書きが表示され <Ui>申請する</Ui> が押せません。
                <Ui>登録</Ui> を押して入力してください（入力のしかたは <DocLink href="/docs/profile">登録情報を変更する</DocLink>）。来店型のサービスでも、連絡先として必要です。
              </p>
              <Shot name="exchange-confirm-missing" alt="お届け先・連絡先が未登録のときの注意書き" maxWidth={640} />
            </Callout>
          </Step>
          <Step number={3} title={<><Mark>3</Mark> <Ui>申請する</Ui> を押します</>}>
            <p>
              一覧画面に戻り、「交換を申請しました。」と表示されれば完了です。この時点で必要ポイントが保有ポイントから引かれます。
            </p>
            <Shot name="exchange-requested" alt="交換を申請しましたのメッセージ" />
          </Step>
        </Steps>
      </Section>

      <Section id="after" title="申請したあとの流れ">
        <p>申請した交換は、提携企業の対応に合わせて次のように状態が変わります。状態は <DocLink href="/docs/exchange-history">交換履歴</DocLink> で確認できます。</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-32 px-4 py-3 font-bold">状態</th>
                <th className="px-4 py-3 font-bold">意味</th>
              </tr>
            </thead>
            <tbody className="align-top leading-7">
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3"><StatusChip status="申請中" /></td>
                <td className="px-4 py-3">申請を送った直後の状態です。提携企業が内容を確認しています。</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3"><StatusChip status="準備中" /></td>
                <td className="px-4 py-3">提携企業が申請を承認し、商品の準備をしています。配送商品はこの間にお届け日の調整を行います。</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3"><StatusChip status="対応中" /></td>
                <td className="px-4 py-3">商品が発送された、またはサービスの提供が始まった状態です。</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3"><StatusChip status="完了" /></td>
                <td className="px-4 py-3">商品を受け取った、またはサービスを利用した状態です。使ったポイントが確定します。</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3"><StatusChip status="却下" /> <StatusChip status="キャンセル" /></td>
                <td className="px-4 py-3">在庫切れなどで提携企業が却下した、またはあなたがキャンセルした状態です。使ったポイントは<strong>全額戻ります</strong>。</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout kind="point" title="申請のあとにやること">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>配送の商品</strong>：承認後、お届け日の候補が届いたら日にちを選びます。商品が届いたら <Ui>受け取りました</Ui> を押します（<DocLink href="/docs/delivery-schedule">お届け日を選ぶ・受け取る</DocLink>）。
            </li>
            <li>
              <strong>予約が必要なサービス</strong>：承認後に届く予約案内に沿って、ご自身で店舗に予約します（<DocLink href="/docs/reservation">予約が必要なサービス</DocLink>）。
            </li>
          </ul>
        </Callout>
        <Callout kind="info" title="申請を取り消したいとき">
          <p>
            お届け日の調整がある商品は、お届け日が確定する前なら、交換の画面の <Ui>交換をキャンセルする</Ui> からご自身でキャンセルできます。
            それ以外の商品は、提携企業または会社の管理者にご相談ください。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
