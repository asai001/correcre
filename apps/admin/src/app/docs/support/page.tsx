import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "運用者への問い合わせ" };

const HREF = "/docs/support";

const CATEGORIES = [
  ["ログイン・招待", "ログインできない、招待メールが届かない、仮パスワードの期限が切れた など"],
  ["アカウント・権限", "従業員の休止・削除、権限の変更、認証連携が「未連携」になっている など"],
  ["データ確認", "ポイントや達成率の数字の確認、報告の取り消し など"],
  ["不具合・システム", "画面が表示されない、エラーが出る など"],
  ["その他", "ミッションの見直し、請求、契約内容の相談 など"],
];

export default function SupportDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={<>操作で困ったときや、運用者（コレクレ運営）に依頼・確認したいことがあるときは、この画面から問い合わせを送れます。</>}
        goals={["問い合わせの送り方", "伝わりやすい書き方のコツ"]}
      />

      <Section id="send" title="問い合わせを送る">
        <Shot name="support" alt="運用者に問い合わせの画面。カテゴリ・件名・内容と送信ボタン" />
        <Steps>
          <Step number={1} title={<>上部メニューの <Ui>問い合わせ</Ui> を開きます</>} />
          <Step number={2} title={<><Mark>1</Mark> <Ui>カテゴリ</Ui> を選びます</>}>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[480px] text-sm">
                <tbody className="leading-7">
                  {CATEGORIES.map(([name, desc]) => (
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
          </Step>
          <Step number={3} title={<><Mark>2</Mark> <Ui>件名</Ui> と <Mark>3</Mark> <Ui>内容</Ui> を入力します</>}>
            <p>件名は 120 文字まで、内容は 10 文字以上 4,000 文字までです。</p>
          </Step>
          <Step number={4} title={<><Mark>4</Mark> <Ui>送信</Ui> を押します</>}>
            <p>
              「問い合わせを送信しました。」と問い合わせ ID が表示されれば完了です。会社名・お名前・開いていた画面の URL は自動で添付されます。運用者が内容を確認してご連絡します。
            </p>
          </Step>
        </Steps>
        <Callout kind="tip" title="伝わりやすい書き方">
          <ul className="list-disc space-y-1 pl-5">
            <li>「いつ」「どの画面で」「何をしたら」「どうなったか」を書いてください。</li>
            <li>従業員についての問い合わせは、氏名とメールアドレス（またはユーザー ID）を書くとすぐに調べられます。</li>
            <li>エラーメッセージが表示された場合は、その文章をそのまま書き写してください。</li>
          </ul>
        </Callout>
        <Callout kind="info" title="よくある依頼">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              退職した従業員を休止中にしたい → カテゴリ「アカウント・権限」で、氏名とメールアドレスを添えて依頼します（<DocLink href="/docs/users#remove">退職した従業員の扱い</DocLink>）。
            </li>
            <li>ミッションの内容や点数を見直したい → カテゴリ「その他」で、変更したい内容を書いて相談します。翌月 1 日からの反映が基本です。</li>
            <li>従業員が間違えて報告した → カテゴリ「データ確認」で、従業員名・日時・ミッション名を書いて依頼します。</li>
          </ul>
        </Callout>
        <Callout kind="info" title="ログインできないときは">
          <p>
            この画面はログインしないと使えません。ログインできない場合は、まず <DocLink href="/docs/login#forgot">パスワードの再設定</DocLink> をお試しください。
            それでも解決しない場合は、コレクレ運営へ直接ご連絡ください。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
