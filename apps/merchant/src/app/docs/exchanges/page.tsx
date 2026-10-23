import type { Metadata } from "next";

import {
  Callout,
  ChapterHeader,
  DocLink,
  Mark,
  PrevNext,
  Section,
  Shot,
  StatusChip,
  Step,
  Steps,
  SubSection,
  Ui,
} from "../_components/content";

export const metadata: Metadata = { title: "交換申請に対応する" };

const HREF = "/docs/exchanges";

export default function ExchangesDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            申請者があなたの商品をポイントで選ぶと、<strong>交換申請</strong>が届きます。
            画面のボタンで「承認 → 発送 → 完了」と状態を進めながら、商品・サービスをお届けします。
          </>
        }
        goals={["交換の「状態」の意味と流れ", "申請の承認・却下のしかた", "発送したとき・届いたときの操作", "「届いていない」と連絡があったときの対応"]}
      />

      <Section id="status" title="交換の「状態」と流れ">
        <p>交換申請は、次の順番で状態が進みます。状態を進めるのは、基本的にあなた（提携企業）です。</p>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold">
          <StatusChip status="申請中" />→<StatusChip status="準備中" />→<StatusChip status="対応中" />→<StatusChip status="完了" />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-28 px-4 py-3 font-bold">状態</th>
                <th className="px-4 py-3 font-bold">どんな状態か</th>
                <th className="w-64 px-4 py-3 font-bold">あなたがすること</th>
              </tr>
            </thead>
            <tbody className="align-top leading-7">
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3"><StatusChip status="申請中" /></td>
                <td className="px-4 py-3">申請者から申請が届いたところ。</td>
                <td className="px-4 py-3">内容を確認して <Ui>承認して準備に進める</Ui></td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3"><StatusChip status="準備中" /></td>
                <td className="px-4 py-3">承認済みで、商品の準備をしているところ。</td>
                <td className="px-4 py-3">発送したら <Ui>発送済みにする</Ui>（サービスは <Ui>対応を開始する</Ui>）</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3"><StatusChip status="対応中" /></td>
                <td className="px-4 py-3">発送済み、またはサービスを提供しているところ。</td>
                <td className="px-4 py-3">届いた・提供が済んだら <Ui>完了にする</Ui></td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3"><StatusChip status="完了" /></td>
                <td className="px-4 py-3">お届けが終わり、ポイントの支払いが確定した状態。売上として集計されます。</td>
                <td className="px-4 py-3">なし</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <StatusChip status="却下" />
                  <StatusChip status="キャンセル" />
                </td>
                <td className="px-4 py-3">提供できずに取りやめた状態。ポイントは申請者に返されます。</td>
                <td className="px-4 py-3">なし</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout kind="point" title="ポイントはいつ確定する？">
          <p>
            申請者のポイントは、申請してから完了するまで<strong>「預かり（保留）」</strong>の状態です。
            <StatusChip status="完了" /> になった時点で支払いが確定し、あなたの売上になります。
            <StatusChip status="却下" /> や <StatusChip status="キャンセル" /> にすると、ポイントは申請者に返されます。
          </p>
        </Callout>
      </Section>

      <Section id="notice" title="交換申請が届いたら">
        <p>
          交換申請が届くと、あなたのメールアドレスに <strong>「【コレクレ】商品・サービス交換申請のご確認依頼」</strong> というメールが届きます。
          ログインして、<DocLink href="/docs/dashboard#todo">ダッシュボードのやることリスト</DocLink> か、上部メニューの <Ui>交換管理</Ui> から確認してください。
        </p>
        <Shot name="exchanges-list" alt="交換管理の一覧画面" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Mark>1</Mark> <Ui>状態で絞り込む</Ui>：「申請中」だけ、「準備中」だけ、のように表示を絞り込めます。
          </li>
          <li>
            <Mark>2</Mark> 各行を押すと、その交換の詳しい画面（交換詳細）が開きます。
          </li>
        </ul>
      </Section>

      <Section id="approve" title="申請を確認して承認する">
        <Steps>
          <Step number={1} title="交換詳細の画面で、申請の内容を確認します">
            <Shot name="exchange-info" alt="交換詳細の上部。商品名、申請者の名前、メールアドレス、電話番号、住所が表示されている" />
            <p>
              商品名・使用ポイントのほか、<strong>申請者のお名前・メールアドレス・電話番号・住所</strong>が表示されます。
              発送するときは、この住所・お名前をお届け先として使ってください。
            </p>
            <Callout kind="caution" title="個人情報の取り扱い">
              <p>
                申請者の住所・連絡先は、<strong>商品のお届けとそれに必要な連絡のためだけ</strong>にお使いください。
                ダイレクトメールや自社サービスのご案内などに使うことはできません（提携企業向け規約 第9条）。
              </p>
            </Callout>
          </Step>
          <Step number={2} title={<>画面下の「状態を更新する」で <Ui>承認して準備に進める</Ui> を押します</>}>
            <Shot name="exchange-requested-actions" alt="状態を更新する欄。コメント入力欄と、承認・却下・強制キャンセルのボタン" />
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <Mark>1</Mark> <Ui>コメント（任意）</Ui>：社内向けのメモです。<strong>申請者には表示されません。</strong>履歴に残ります。
              </li>
              <li>
                <Mark>2</Mark> <Ui>承認して準備に進める</Ui>：申請を受けて、状態が <StatusChip status="準備中" /> になります。申請者の画面にも反映されます。
              </li>
              <li>
                <Mark>3</Mark> <Ui>却下する</Ui>：在庫切れなどで提供できないときに使います。確認メッセージで <Ui>OK</Ui> を押すと、ポイントが申請者に返されます。
              </li>
            </ul>
            <p>
              画面の上に「状態を「準備中」に更新しました。」と緑色で表示されれば完了です。
            </p>
          </Step>
        </Steps>
        <Callout kind="tip" title="なるべく早めに承認を">
          <p>
            申請から 2 日以上そのままにしていると、やることリストで「急ぎ」として表示されます。申請者はポイントを預けたまま待っていますので、早めの対応をお願いします。
          </p>
        </Callout>
      </Section>

      <Section id="ship" title="商品を発送したら「発送済み」にする">
        <p>
          <StatusChip status="準備中" /> の交換詳細画面には「発送情報」の欄が表示されます。商品を発送したら、次の操作をします。
        </p>
        <Steps>
          <Step number={1} title="（任意）配送会社と送り状番号を入力します">
            <Shot name="exchange-preparing-shipment" alt="発送情報の入力欄。配送会社と送り状番号" />
            <p>
              <Mark>1</Mark> <Ui>配送会社</Ui> を選び、<Mark>2</Mark> <Ui>送り状番号</Ui> を入力します。
              登録しておくと、申請者が自分で配送状況を確認できるようになり、「まだ届きませんか」という問い合わせが減ります。
              入力しなくても次に進めます。ハイフンは入れても入れなくても構いません。
            </p>
          </Step>
          <Step number={2} title={<><Ui>発送済みにする</Ui> を押します</>}>
            <Shot name="exchange-preparing-actions" alt="状態を更新する欄の発送済みにするボタン" />
            <p>
              状態が <StatusChip status="対応中" /> になり、「発送済みにしました。お届け日を過ぎたら「完了にする」へ進めてください。」と表示されます。
            </p>
          </Step>
        </Steps>
        <Callout kind="info" title="発送のないサービスの場合">
          <p>
            来店・出張・オンラインなど発送のない商品では、発送情報の欄は表示されず、ボタンは <Ui>対応を開始する</Ui> になります。
            サービスの提供を始めるときに押してください。
          </p>
        </Callout>
        <SubSection title="あとから送り状番号を登録・修正する">
          <div id="tracking" className="scroll-mt-24" />
          <p>
            <StatusChip status="対応中" /> になったあとでも、発送情報の欄の <Ui>送り状番号を登録する</Ui>（登録済みなら <Ui>修正する</Ui>）から入力できます。
            入力したら <Ui>保存する</Ui> を押します。
          </p>
          <Shot name="exchange-inprogress-shipment" alt="登録済みの発送情報。配送状況を確認するリンクと修正するボタン" />
        </SubSection>
      </Section>

      <Section id="complete" title="届いたら「完了」にする">
        <Steps>
          <Step number={1} title="お届け（サービスの提供）が終わったことを確認します">
            <p>送り状番号を登録していれば、<Ui>配送状況を確認する</Ui> から配送会社の追跡ページを開けます。</p>
          </Step>
          <Step number={2} title={<><Ui>完了にする</Ui> を押し、確認メッセージで <Ui>OK</Ui> を押します</>}>
            <Shot name="exchange-inprogress-actions" alt="状態を更新する欄の完了にするボタンと準備中に戻すボタン" />
            <p>
              状態が <StatusChip status="完了" /> になり、ポイントの支払いが確定します。完了にした交換が、
              <DocLink href="/docs/settlement">収支・精算</DocLink> の売上として集計されます。
            </p>
          </Step>
        </Steps>
        <Callout kind="info">
          <ul className="list-disc space-y-1 pl-5">
            <li>申請者が商品を受け取ったあと、申請者自身が「受け取った」と操作して完了になる場合もあります。</li>
            <li>
              発送済みにしたのが間違いだったときは、<Ui>準備中に戻す</Ui> で一つ前の状態に戻せます。
            </li>
            <li>
              <strong>完了にしたあとは、あなたの画面からは元に戻せません。</strong>間違えた場合は <DocLink href="/docs/support">運用者に問い合わせ</DocLink> てください。
            </li>
          </ul>
        </Callout>
        <p>完了した交換の画面では、いつ・誰が状態を進めたかを「状態遷移ログ」で確認できます。</p>
        <Shot name="exchange-log" alt="状態遷移ログ。申請中から完了までの履歴" />
      </Section>

      <Section id="delivery-issue" title="「商品が届いていない」と連絡があったとき">
        <p>申請者が「届いていない」と報告すると、交換詳細の画面に次のような黄色い表示が出ます。やることリストにも「急ぎ」で表示されます。</p>
        <Shot name="exchange-delivery-issue" alt="申請者から商品が届いていないと連絡がありましたという警告" />
        <ol className="list-decimal space-y-2 pl-6">
          <li>送り状番号から配送状況を確認します（配送会社への問い合わせを含む）。</li>
          <li>配達済みであれば、申請者に連絡して状況を確認します。</li>
          <li>紛失・破損などの場合は、再送などの対応をお願いします（提携企業向け規約 第5条・第7条）。</li>
          <li>お届けが確認できたら <Ui>完了にする</Ui> を押します。</li>
        </ol>
        <p>対応に困ったときは、<DocLink href="/docs/support">運用者に問い合わせ</DocLink> てください。</p>
      </Section>

      <Section id="cancel" title="提供できなくなったとき（却下・強制キャンセル）">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <StatusChip status="申請中" /> のとき：<Ui>却下する</Ui> を押します。
          </li>
          <li>
            <StatusChip status="申請中" /> <StatusChip status="準備中" /> のとき：<Ui>強制キャンセルする</Ui> も使えます。
          </li>
        </ul>
        <p>どちらも確認メッセージで <Ui>OK</Ui> を押すと、ポイントが申請者に返されます。元には戻せないので、押す前に申請者への連絡が必要かご確認ください。</p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
