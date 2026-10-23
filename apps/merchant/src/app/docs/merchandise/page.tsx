import type { Metadata } from "next";

import {
  Callout,
  ChapterHeader,
  DocLink,
  FieldTable,
  Mark,
  PrevNext,
  Section,
  Shot,
  SubSection,
  Ui,
} from "../_components/content";

export const metadata: Metadata = { title: "商品・サービスを登録する" };

const HREF = "/docs/merchandise";

export default function MerchandiseDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            申請者がポイントで交換できるように、あなたの商品・サービスを登録します。
            <strong>「公開」した商品だけ</strong>が申請者の画面に表示されます。準備中の商品は「下書き」で保存しておけます。
          </>
        }
        goals={["商品の新規登録のしかた（各項目の書き方）", "下書き保存と公開の違い", "登録した商品の編集・非公開・削除"]}
      />

      <Section id="list" title="商品・サービスの一覧画面">
        <p>
          上部メニューの <Ui>商品・サービス管理</Ui> を押すと、登録済みの商品が一覧で表示されます。
        </p>
        <Shot name="merchandise-list" alt="商品・サービス管理の一覧画面。右上の新規登録ボタンが1番で示されている" />
        <p>商品ごとのカードの左上には、いまの状態が表示されます。</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">公開中</span>
            <p className="mt-2 text-sm leading-7">申請者の画面に表示され、交換申請を受け付けます。</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">非公開</span>
            <p className="mt-2 text-sm leading-7">一時的に表示を止めている状態です。売り切れ・休業中などに使います。</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">下書き</span>
            <p className="mt-2 text-sm leading-7">入力途中で保存した状態です。申請者には表示されません。</p>
          </div>
        </div>
      </Section>

      <Section id="new" title="商品を新しく登録する">
        <p>
          一覧画面右上の <Mark>1</Mark> <Ui>新規登録</Ui> を押すと、登録画面が開きます。
          画面の左側が入力欄、右側が<strong>申請者にどう見えるかのプレビュー</strong>です。入力すると右側のプレビューにすぐ反映されます。
        </p>
        <Shot name="merchandise-new-filled" alt="商品・サービス新規登録画面に入力した例。右側にプレビューが表示されている" caption="入力例。右側のプレビューで、申請者の画面での見え方を確認できます。" />
        <Callout kind="caution" title="入力に時間がかかるときは、こまめに「下書き保存」を">
          <p>
            30 分ほど保存などの操作をしないと、自動でログアウトされ、入力内容が保存できなくなることがあります。
            説明文を考えながら入力するときは、途中で <Ui>下書き保存</Ui> を押しておくと安心です。
          </p>
        </Callout>

        <SubSection title="① 基本情報">
          <Shot name="merchandise-basic" alt="基本情報の入力欄。1から7の番号が付いている" />
          <FieldTable
            rows={[
              { name: "① 商品・サービス名", required: true, description: "一覧に表示される名前です。冷蔵・冷凍品は【冷蔵】のように頭に付けると分かりやすくなります。", example: "【冷蔵】生クリームパン 6個入り" },
              { name: "② 商品・サービス内容", required: true, description: "どんな商品・サービスかを説明します。特徴・おすすめポイントなど。改行もできます。" },
              {
                name: "③ 価格",
                required: true,
                description: (
                  <>
                    <strong>税・送料・出張費などをすべて含んだ金額</strong>を、半角数字で入力します（円）。申請者が追加でお金を払うことはありません。
                  </>
                ),
                example: "4150",
              },
              { name: "④ 必要ポイント数", description: "価格を入れると自動で計算されます（価格 ÷ 5。端数は切り上げ）。入力は不要です。", example: "4,150円 → 830pt" },
              { name: "⑤ 提供方法", description: "当てはまるものすべてにチェックを入れます（来店・出張・発送・オンライン）。" },
              { name: "⑥ 対応エリア", required: true, description: "商品・サービスを提供できる地域です。", example: "全国対応（沖縄・離島を除く）／名古屋市内 など" },
              { name: "⑦ ジャンル", required: true, description: "一覧から選びます。当てはまらなければ「その他」を選び、ジャンル名を入力します。" },
            ]}
          />
        </SubSection>

        <SubSection title="② 詳細メタ情報（任意）">
          <Shot name="merchandise-meta" alt="詳細メタ情報の入力欄" />
          <p>
            商品の詳しいページの「商品詳細情報」の表に表示されます。分かる範囲で入力してください。<strong>商品コード</strong>は登録時に自動で付きます。
          </p>
          <FieldTable
            rows={[
              { name: "内容量", description: "数量・サイズなど。", example: "6個入り（個包装）" },
              { name: "賞味期限 / 有効期限", description: "食品の賞味期限や、チケット・サービスの有効期限。", example: "製造日より冷蔵で5日間" },
              { name: "お届け予定 / 提供までの目安", description: "申請からお届け（提供）までのおおよその日数。", example: "申込みから7〜10営業日" },
              { name: "注意事項", description: "保存方法・アレルギー・ご利用条件など。", example: "要冷蔵保存／乳・小麦・卵を含みます" },
            ]}
          />
        </SubSection>

        <SubSection title="③ 配送・日程調整（お届け日を相談する商品だけ）">
          <p>
            冷蔵・冷凍品など、<strong>受け取る日をお客様と決めてから発送したい商品</strong>はここをオンにします。
            常温で、いつ届いてもよい商品はオフのままで構いません。
          </p>
          <Shot name="merchandise-scheduling-off" alt="配送・日程調整（オフの状態）" />
          <p>
            スイッチをオンにすると、詳しい設定が表示されます。<strong>質問に答える形</strong>になっているので、上から順に入力してください。
          </p>
          <Shot name="merchandise-scheduling-on" alt="配送・日程調整をオンにした状態の設定項目" maxWidth={760} />
          <FieldTable
            rows={[
              { name: "受け渡し方法", description: "「配送」か「店頭受け取り」を選びます。" },
              { name: "温度帯", description: "常温・冷蔵・冷凍から選びます。冷蔵・冷凍を選ぶと、時間帯の指定がすべて選べる状態になります。" },
              { name: "発送までの日数", description: "お届け日が決まってから発送するまでに必要な日数です（お休みの日は数えません）。当日発送できるなら 0。", example: "2" },
              { name: "届くまでの日数", description: "発送してからお届け先に届くまでの日数。一番時間がかかる地域に合わせます。", example: "翌日届くなら 1" },
              { name: "締め時刻", description: "その日のうちに発送するには、何時までにお届け日が決まっている必要があるか。宅配便の集荷時間に合わせます。", example: "12:00" },
              { name: "発送できる曜日", description: "製造・梱包の都合で発送できる曜日だけにチェックを入れます。" },
              { name: "選べる時間帯", description: "申請者が選べる配達時間帯です。指定できると不在による受け取り失敗が減ります。" },
              { name: "候補日の件数", description: "申請者に見せるお届け日の候補の数。迷ったら 4 件のままで大丈夫です（1〜10）。" },
            ]}
          />
          <p>入力した設定で、実際にどの日付が候補になるかが緑の枠に表示されます。早すぎる・遅すぎると感じたら、日数や曜日を調整してください。</p>
          <Shot name="merchandise-scheduling-preview" alt="この設定だと、こうなります という候補日のプレビュー" />
          <Callout kind="tip">
            <p>
              お休みの日は <DocLink href="/docs/calendar">休業日カレンダー</DocLink> に登録しておくと、自動で候補から外れます。
              申請が届いてからの操作は <DocLink href="/docs/delivery-schedule">お届け日の調整</DocLink> の章で説明します。
            </p>
          </Callout>
        </SubSection>

        <SubSection title="④ 予約のご案内（サロン・施術など予約が必要なサービスだけ）">
          <Shot name="merchandise-reservation-off" alt="予約のご案内（オフの状態）" />
          <p>
            申請者に予約サイトや電話で予約してもらう必要があるサービスは、スイッチをオンにして予約先を入力します。
            交換申請を承認すると、ここに入力した予約先が申請者へ自動でメール案内されます。
          </p>
          <Shot name="merchandise-reservation-on" alt="予約のご案内をオンにして、ホットペッパービューティーのURLを入力した状態" />
          <p>
            くわしくは <DocLink href="/docs/reservation">予約が必要なサービス</DocLink> の章をご覧ください。
          </p>
        </SubSection>

        <SubSection title="⑤ 画像">
          <Shot name="merchandise-images" alt="画像のアップロード欄。一覧カード用画像と詳細ページ用画像" />
          <p>
            <Mark>1</Mark> <strong>一覧カード用画像</strong>（商品一覧に並ぶ小さな画像）と、<Mark>2</Mark> <strong>詳細ページ用画像</strong>（商品を開いたときの大きな画像）を登録できます。
            それぞれ <Ui>画像を選択</Ui> を押して、パソコンに保存してある写真を選びます。
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>使える形式：JPEG（.jpg）・PNG（.png）・WebP（.webp）</li>
            <li>1 枚あたり 10MB まで</li>
            <li>横長の写真がきれいに表示されます（表示する枠に合わせて、写真の端が少し切れることがあります）</li>
          </ul>
        </SubSection>

        <SubSection title="⑥ 保存する">
          <Shot name="merchandise-submit" alt="下書き保存ボタンと登録して公開するボタン" />
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <Mark>A</Mark> <Ui>下書き保存</Ui>：入力途中でも保存できます。申請者には表示されません。
            </li>
            <li>
              <Mark>B</Mark> <Ui>登録して公開する</Ui>：必須項目が入力されているか確認したうえで登録し、<strong>すぐに申請者の画面に表示</strong>されます。
            </li>
          </ul>
          <p>保存すると一覧画面に戻ります。入力に不足があると、ボタンの近くと画面上部に赤いメッセージが表示されます。</p>
        </SubSection>
      </Section>

      <Section id="edit" title="登録した商品を編集・非公開・削除する">
        <p>一覧画面の各カードの下に、操作ボタンがあります。</p>
        <Shot name="merchandise-card" alt="商品カードの編集・削除・非公開にするボタン" maxWidth={520} />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Mark>A</Mark> <Ui>編集</Ui>：登録内容を変更します。変更したら画面下の <Ui>変更を保存</Ui> を押します。
          </li>
          <li>
            <Mark>B</Mark> <Ui>削除</Ui>：商品を削除します。確認のメッセージで <Ui>OK</Ui> を押すと削除されます。<strong>元に戻せません。</strong>
          </li>
          <li>
            <Mark>C</Mark> <Ui>非公開にする</Ui>／<Ui>公開する</Ui>：申請者の画面への表示を止めたり、再開したりします。
          </li>
        </ul>
        <Callout kind="point" title="売り切れ・休業のときは「非公開」に">
          <p>
            在庫切れや長期休業などで提供できないときは、削除ではなく <Ui>非公開にする</Ui> を押してください。
            再開するときは <Ui>公開する</Ui> を押すだけで、入力し直す必要はありません。
          </p>
        </Callout>

        <SubSection title="下書きの商品を公開する">
          <div id="draft" className="scroll-mt-24" />
          <p>下書きの商品の編集画面には、次の 2 つのボタンが表示されます。</p>
          <Shot name="merchandise-draft-submit" alt="下書きを保存ボタンと保存して公開するボタン" />
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <Mark>A</Mark> <Ui>下書きを保存</Ui>：下書きのまま保存します。
            </li>
            <li>
              <Mark>B</Mark> <Ui>保存して公開する</Ui>：必須項目を確認して公開します。
            </li>
          </ul>
          <p>一覧画面の <Ui>公開する</Ui> ボタンからも公開できます。</p>
        </SubSection>

        <SubSection title="誰がいつ変更したかを確認する">
          <p>編集画面の下のほうにある「操作履歴」で、登録・編集・公開状態の変更を、誰がいつ行ったか確認できます。</p>
          <Shot name="merchandise-history" alt="商品の操作履歴" />
        </SubSection>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
