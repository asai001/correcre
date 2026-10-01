import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "運用者への問い合わせ" };

const HREF = "/docs/support";

const CATEGORIES = [
  ["ログイン・招待", "ログインできない、招待メールが届かない など"],
  ["アカウント・権限", "ユーザーの削除、管理者への変更、ログイン用メールアドレスの変更 など"],
  ["商品・サービス", "商品の登録方法、掲載内容の相談 など"],
  ["交換管理", "状態を間違えて進めた、申請者と連絡がとれない など"],
  ["請求・精算", "請求額・入金について"],
  ["不具合・システム", "画面が表示されない、エラーが出る など"],
  ["その他", "上のどれにも当てはまらないこと"],
];

export default function SupportDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={<>操作で困ったときや、運用者（コレクレ運営）に確認したいことがあるときは、この画面から問い合わせを送れます。</>}
        goals={["問い合わせの送り方", "伝わりやすい書き方のコツ"]}
      />

      <Section id="send" title="問い合わせを送る">
        <Shot name="support" alt="運用者に問い合わせの画面。カテゴリ・件名・内容と送信ボタン" />
        <Steps>
          <Step number={1} title={<>上部メニューの <Ui>問い合わせ</Ui> を開きます</>}/>
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
              「問い合わせを送信しました。」と問い合わせ ID が表示されれば完了です。運用者が内容を確認してご連絡します。
            </p>
          </Step>
        </Steps>
        <Callout kind="tip" title="伝わりやすい書き方">
          <ul className="list-disc space-y-1 pl-5">
            <li>「いつ」「どの画面で」「何をしたら」「どうなったか」を書いてください。</li>
            <li>交換についての問い合わせは、商品名・申請者のお名前・申請日時（予約サービスは交換番号）を書くとすぐに調べられます。</li>
            <li>エラーメッセージが表示された場合は、その文章をそのまま書き写してください。</li>
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
