import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "社内のユーザーを追加する" };

const HREF = "/docs/users";

export default function UsersDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            発送担当の方など、<strong>社内のほかの担当者も</strong>ログインできるように招待する画面です。
            1 つのアカウントを使い回さず、担当者ごとにユーザーを作ると「誰が操作したか」が履歴に残ります。管理者のユーザーだけが開けます。
          </>
        }
        goals={["ユーザーの招待のしかた", "管理者と一般ユーザーの違い", "招待した人がすること"]}
      />

      <Section id="invite" title="ユーザーを招待する">
        <Shot name="users" alt="ユーザー管理の画面。招待フォームと登録済みのユーザーの一覧" />
        <Steps>
          <Step number={1} title={<>上部メニューの <Ui>ユーザー管理</Ui> を開きます</>}/>
          <Step number={2} title={<><Mark>1</Mark> 招待する方のお名前とメールアドレスを入力します</>}>
            <p>
              <Ui>姓</Ui>・<Ui>名</Ui>・<Ui>メールアドレス</Ui> は必須です。メールアドレスがその方のログインID になります。カナ・電話番号は任意です。
            </p>
          </Step>
          <Step number={3} title={<>（必要なら）<Mark>2</Mark> <Ui>管理者として招待する</Ui> にチェックを入れます</>}>
            <p>下の表を参考に決めてください。迷ったら、チェックを入れずに「一般」で招待するのがおすすめです。</p>
          </Step>
          <Step number={4} title={<><Mark>3</Mark> <Ui>招待メールを送信</Ui> を押します</>}>
            <p>
              「◯◯ さんへ招待メールを送信しました。」と表示され、下の「登録済みのユーザー」に <Ui>招待中</Ui> として追加されます。
              招待された方には、仮パスワード付きのメールが届きます。
            </p>
          </Step>
        </Steps>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-32 px-4 py-3 font-bold">種類</th>
                <th className="px-4 py-3 font-bold">使える画面</th>
              </tr>
            </thead>
            <tbody className="align-top leading-7">
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold">一般</td>
                <td className="px-4 py-3">ダッシュボード・商品・サービス管理・交換管理・休業日カレンダー・問い合わせ</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold">管理者</td>
                <td className="px-4 py-3">一般の画面に加えて、収支・精算（売上・請求）・会社情報（振込先）・ユーザー管理</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="after" title="招待された方がすること">
        <p>
          招待された方は、届いたメール「【コレクレ】アカウント登録のご案内」の仮パスワードでログインし、新しいパスワードを設定します。
          手順は <DocLink href="/docs/first-login">初回ログインとパスワード設定</DocLink> と同じです。この資料のページをお伝えください。
        </p>
        <p>
          ログインが済むと、一覧の表示が <Ui>招待中</Ui> から <Ui>ログイン済み</Ui> に変わります。
        </p>
        <Callout kind="info" title="ユーザーの削除・権限の変更">
          <p>
            退職などでユーザーを使えなくしたい場合や、一般 ⇔ 管理者を切り替えたい場合は、<DocLink href="/docs/support">運用者にお問い合わせ</DocLink>ください
            （カテゴリは「アカウント・権限」を選びます）。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
