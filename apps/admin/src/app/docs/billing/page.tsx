import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "請求情報と請求書" };

const HREF = "/docs/billing";

export default function BillingDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            各種情報の<strong>請求情報</strong>タブでは、コレクレの月額利用料を確認できます。当月の見込み額、請求日と支払期限、これまでの請求履歴が表示され、
            金額が確定した月の<strong>請求書</strong>を表示・ダウンロードできます。
          </>
        }
        goals={["利用料の計算のしかた", "請求情報の見かた", "会社ポイントへの還元", "請求書の表示と PDF 保存"]}
      />

      <Section id="rule" title="利用料の計算と締め日">
        <Callout kind="point" title="ご利用料金 ＝ 月額基本料 ＋ ID 料金 × 利用人数">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>月額基本料</strong>：利用人数に関係なく毎月かかる料金です。
            </li>
            <li>
              <strong>ID 料金</strong>：従業員 1 人あたりの月額料金です。この金額が、従業員が満点を取ったときにもらえるポイントの原資になります。
            </li>
            <li>
              <strong>利用人数</strong>：権限に「従業員」を持ち、状態が「有効」または「招待中」で、利用開始日を迎えた人の人数です。
              休止中の人と、権限が「管理者」だけの人は含まれません。招待中の人を含めるのは、招待した方に登録を進めていただくためです。
            </li>
          </ul>
        </Callout>
        <p>
          当月分は<strong>月末時点</strong>の利用人数で金額が確定し、<strong>月末締め・翌月 15 日払い</strong>でご請求します。月の途中で人数が変わっても、月末の人数で計算されます。
        </p>
        <p>
          月の途中で従業員を登録するときは、<strong>利用開始日</strong>を翌月 1 日にしておくと、その月の利用人数には入らず、翌月から数えられます（
          <DocLink href="/docs/users#register">従業員を登録する</DocLink>）。
        </p>
      </Section>

      <Section id="view" title="請求情報を見る">
        <p>
          上部メニューの <Ui>各種情報</Ui> を開き、<Ui>請求情報</Ui> のタブを押します。
        </p>
        <Shot name="info-billing" alt="請求情報のタブ。当月の見込み額、請求日、お支払期限、請求履歴の表" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Mark>1</Mark> <strong>今月のご利用料金（見込み）</strong>：いまの利用人数で計算した当月の金額です。月末まで変わる可能性があります。内訳（月額基本料・ID 料金 × 人数）も表示されます。
          </li>
          <li>
            <Mark>2</Mark> <strong>請求日（締め日）・お支払期限</strong>：当月分の締め日と支払期限です。
          </li>
          <li>
            <Mark>3</Mark> <strong>請求履歴の表</strong>：月ごとの利用人数・金額・会社への還元・状態です。状態は「見込み」（当月）、「確定」（月末を過ぎた月）、「請求なし」（契約が無効だった月）のいずれかです。
          </li>
        </ul>
        <Callout kind="info">
          <p>
            月の欄に「※」が付いている月は、当時の記録が残っていないため、現在の契約内容から算出した参考値です。
          </p>
        </Callout>
      </Section>

      <Section id="point-return" title="会社ポイントへの還元">
        <p>
          ID 料金は、従業員が満点を取ったときのポイントの原資です。<strong>従業員が獲得しなかった分のポイントは消えずに、翌月 1 日に会社ポイントとして戻ります</strong>
          （2026 年 11 月分から）。戻ったポイントは、成果の高い従業員への追加の付与や社内イベントなどに使えます（
          <DocLink href="/docs/user-edit#points">ポイントを調整する</DocLink>）。
        </p>
        <Callout kind="point" title="会社への還元 ＝ ID 料金分のポイント − 従業員が獲得したポイント">
          <p>
            たとえば ID 料金 1,000 円・利用人数 3 名の月は、ID 料金分が 600pt（1 名 200pt × 3 名）です。従業員がその月に合計 450pt を獲得していれば、残りの 150pt が会社に戻ります。
          </p>
        </Callout>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            請求履歴の表の <Ui>会社への還元</Ui> の列に、月ごとに「+150pt」のように戻った量と、その下に「600 − 450pt」の内訳が表示されます。
          </li>
          <li>当月は「翌月 1 日に確定」、月が明けて集計を待っている間は「集計中」と表示されます。</li>
          <li>
            最後に戻った月と量は、ユーザー管理の「会社ポイント残高」のカードにも表示されます。
          </li>
        </ul>
      </Section>

      <Section id="invoice" title="請求書を表示・ダウンロードする">
        <Steps>
          <Step number={1} title={<>請求履歴の表で、確定した月の <Mark>4</Mark> <Ui>表示・ダウンロード</Ui> を押します</>}>
            <p>請求書が別のタブで開きます。当月分（見込み）の請求書は、月が終わって金額が確定してから表示できます。</p>
          </Step>
          <Step number={2} title={<>内容を確認し、<Mark>1</Mark> <Ui>印刷 / PDF で保存</Ui> を押します</>}>
            <Shot name="invoice" alt="請求書の画面。印刷・PDFで保存ボタンとA4の請求書" />
            <p>
              ブラウザの印刷画面が開きます。送信先（プリンター）を「<strong>PDF に保存</strong>」にすると、PDF ファイルとして保存できます。ファイル名には「請求書_コレクレ_◯年◯月分」が入ります。
            </p>
          </Step>
        </Steps>
        <p>
          請求書には、請求書番号・請求日・宛先（会社名・住所・担当者名）・金額の内訳・消費税・振込先が記載されています。
          宛先の住所・担当者名は <DocLink href="/docs/info#company">会社情報</DocLink> に登録した内容が使われます。
        </p>
        <Callout kind="info" title="金額や内容に疑問があるとき">
          <p>
            利用人数や金額に心当たりがない場合は、<DocLink href="/docs/support">運用者にお問い合わせ</DocLink>ください（カテゴリは「その他」）。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
