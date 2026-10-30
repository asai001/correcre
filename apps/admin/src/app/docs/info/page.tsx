import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, FieldTable, Mark, PrevNext, Section, Shot, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "理念体系・会社情報・ミッション項目" };

const HREF = "/docs/info";

const TABS = [
  ["理念体系", "従業員のダッシュボードに表示する理念・ミッション・ビジョンなどの編集。", "#philosophy"],
  ["会社情報", "表示名・住所・代表者と担当者の連絡先の確認・変更。", "#company"],
  ["登録情報", "登録人数・利用人数・休止中人数の確認。", "#registration"],
  ["部署一覧", "部署と所属従業員の確認、部署の追加。", "#departments"],
  ["ミッション項目", "いま有効なミッションの一覧（確認のみ）。", "#missions"],
  ["請求情報", "月額利用料と請求書。次の章で説明します。", "/docs/billing"],
];

export default function InfoDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            <strong>各種情報</strong>は、会社に関する設定と情報をまとめた画面です。6 つのタブに分かれています。
            この章では「請求情報」以外の 5 つのタブを説明します。請求情報は <DocLink href="/docs/billing">請求情報と請求書</DocLink> をご覧ください。
          </>
        }
        goals={["理念体系の編集と、従業員の画面への反映", "会社情報で変更できる項目", "登録人数・部署・ミッション項目の確認"]}
      />

      <Section id="tabs" title="画面の構成">
        <p>
          上部メニューの <Ui>各種情報</Ui> を開きます。<Mark>1</Mark> のタブを押して切り替えます。
        </p>
        <Shot name="info-tabs" alt="各種情報画面の上部。6つのタブ" />
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[480px] text-sm">
            <tbody className="leading-7">
              {TABS.map(([name, desc, href]) => (
                <tr key={name} className="border-t border-slate-100 first:border-t-0">
                  <th scope="row" className="w-40 px-4 py-2 text-left font-bold text-slate-900">
                    <DocLink href={href.startsWith("#") ? `${HREF}${href}` : href}>{name}</DocLink>
                  </th>
                  <td className="px-4 py-2 text-slate-700">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="philosophy" title="理念体系を編集する">
        <p>
          ここで登録した内容が、従業員向けアプリの<strong>ダッシュボードの一番上</strong>に表示されます。経営理念・ミッション・ビジョン・バリュー・クレドなど、会社で使っている言葉で自由に項目を作れます。
        </p>
        <Shot name="info-philosophy" alt="理念体系の編集。追加ボタン、項目ごとの見出しと内容、保存ボタン" />
        <Steps>
          <Step number={1} title={<>項目を増やすときは <Mark>1</Mark> <Ui>追加</Ui> を押します</>}>
            <p>空の項目が一番下に追加されます。不要な項目は、項目の右上のゴミ箱のマークで削除できます。並び順は、上から順に従業員の画面に表示されます。</p>
          </Step>
          <Step number={2} title={<>項目の <Mark>2</Mark> <Ui>なにを追加するか</Ui>（見出し。例：経営理念）と <Mark>3</Mark> <Ui>どんな内容か</Ui>（本文）を入力します</>}>
            <p>本文は複数行で入力できます。改行はそのまま従業員の画面にも反映されます。</p>
          </Step>
          <Step number={3} title={<><Mark>4</Mark> <Ui>理念体系を保存</Ui> を押します</>}>
            <p>「理念体系を更新しました」と表示されれば完了です。従業員の画面には、次にダッシュボードを開いたときから反映されます。</p>
          </Step>
        </Steps>
        <Callout kind="caution">
          <p>
            見出しだけ・内容だけの項目があると保存できません（「入力内容を確認してください」と表示されます）。使わない項目は削除してください。
            また、30 分操作がないと自動でログアウトされるため、長い文章はあらかじめ用意しておき、貼り付けて保存するのがおすすめです。
          </p>
        </Callout>
      </Section>

      <Section id="company" title="会社情報を確認・変更する">
        <Shot name="info-company" alt="会社情報のタブ。会社ID、会社名、表示名、住所、代表者・担当者の連絡先、保存ボタン" />
        <FieldTable
          rows={[
            { name: "会社 ID・会社名", description: "変更できません（運用者が管理しています）。会社名の変更が必要な場合は運用者にご連絡ください。" },
            { name: "表示名", description: "従業員・管理者のダッシュボードに表示する短い会社名です。未入力の場合は会社名が表示されます。", example: "サンプル商事" },
            { name: "住所", description: "会社の所在地です。請求書の宛先にも使われます。" },
            { name: "代表者名・代表電話番号・代表メールアドレス", description: "会社の代表者の連絡先です。" },
            { name: "担当者名・担当者電話番号・担当者メールアドレス", description: "コレクレの窓口となる担当者の連絡先です。運用者からの連絡に使われます。" },
          ]}
        />
        <p>
          変更したら <Mark>1</Mark> <Ui>会社情報を保存</Ui> を押します。契約プラン・料金・ステータスは運用者だけが変更できます。
        </p>
      </Section>

      <Section id="registration" title="登録情報（人数）を確認する">
        <Shot name="info-registration" alt="登録人数、利用人数、休止中人数のカード" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>登録人数</strong>：招待中・有効・休止中を含む、登録されている全員の人数です。
          </li>
          <li>
            <strong>利用人数</strong>：「有効」の人数です。<strong>月額の ID 料金はこの人数で計算</strong>されます。
          </li>
          <li>
            <strong>休止中人数</strong>：利用を止めている人数です。
          </li>
        </ul>
      </Section>

      <Section id="departments" title="部署一覧を確認する">
        <Shot name="info-departments" alt="部署一覧。部署名、状態、所属人数と、行を開いたときの所属従業員一覧" />
        <p>
          部署ごとの所属人数が表示されます。<Mark>1</Mark> 部署名の左の矢印を押すと、その部署に所属する従業員の名前とメールアドレスが開きます。
          <Mark>2</Mark> <Ui>新しい部署名</Ui> を入力して <Ui>部署を追加</Ui> を押すと、部署を追加できます。
          名称変更・削除は <DocLink href="/docs/departments">部署を管理する</DocLink> の手順で行います。
        </p>
      </Section>

      <Section id="missions" title="ミッション項目を確認する">
        <Shot name="info-missions" alt="ミッション項目一覧。項目名、カテゴリ、点数、回数、入力項目数、状態" />
        <p>
          いま従業員に表示されているミッションの一覧です。項目名・説明・カテゴリ・点数・月の回数・入力項目数・有効/無効が確認できます。
        </p>
        <Callout kind="info" title="ミッションの内容を変えたいとき">
          <p>
            ミッションの追加・変更・無効化は、この画面からは行えません。<DocLink href="/docs/support">運用者にお問い合わせ</DocLink>ください。
            変更は、月の途中の点数計算に影響しないよう、<strong>翌月 1 日から反映</strong>されるのが基本です。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
