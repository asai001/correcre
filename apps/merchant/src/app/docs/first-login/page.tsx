import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "初回ログインとパスワード設定" };

const HREF = "/docs/first-login";

export default function FirstLoginDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            審査が終わると、登録したメールアドレスに<strong>仮パスワード</strong>の書かれたメールが届きます。
            その仮パスワードで一度ログインし、<strong>ご自身で決めた新しいパスワード</strong>に変更すると、ご利用開始です。
          </>
        }
        goals={["招待メールのどこを見ればよいか", "仮パスワードでの最初のログイン", "新しいパスワードの決め方"]}
      />

      <Section id="mail" title="招待メールを確認する">
        <p>
          件名 <strong>「【コレクレ】アカウント登録のご案内」</strong> のメールが届きます。メールには次の 3 つが書かれています。
        </p>
        <Shot name="email-invite" alt="アカウント登録のご案内メールの例。ログインID、仮パスワード、ログイン画面のURLが書かれている" maxWidth={640} />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>ログインID</strong>：登録申請で入力した担当者メールアドレスです。
          </li>
          <li>
            <strong>仮パスワード</strong>：最初のログインだけに使う、一時的なパスワードです。
          </li>
          <li>
            <strong>ログイン画面</strong>：このリンクを押すと、ログイン画面が開きます。
          </li>
        </ul>
        <Callout kind="caution" title="仮パスワードには有効期限があります">
          <p>
            仮パスワードは、メールが届いてから<strong>7 日間</strong>しか使えません。メールが届いたら、お早めにログインしてください。
            期限が切れてしまった場合は、運用者に招待メールの再送をご依頼ください。
          </p>
        </Callout>
      </Section>

      <Section id="login" title="仮パスワードでログインする">
        <Steps>
          <Step number={1} title="メールに書かれた「ログイン画面」のリンクを押します">
            <p>ブラウザでログイン画面が開きます。</p>
          </Step>
          <Step number={2} title={<><Mark>1</Mark> にメールアドレス、<Mark>2</Mark> に仮パスワードを入力します</>}>
            <Shot name="login-filled" alt="ログイン画面にメールアドレスとパスワードを入力したところ" maxWidth={720} />
            <p>
              仮パスワードは、メールからコピーして貼り付けると入力ミスを防げます。前後に空白が入らないようご注意ください。
              パスワード欄の右にある目のマークを押すと、入力した文字を確認できます。
            </p>
          </Step>
          <Step number={3} title={<><Ui>ログイン</Ui> ボタン <Mark>3</Mark> を押します</>}>
            <p>初回は、続けて「新しいパスワードの設定」画面が表示されます。</p>
          </Step>
        </Steps>
      </Section>

      <Section id="new-password" title="新しいパスワードを設定する">
        <Shot name="new-password" alt="新しいパスワードの設定画面" maxWidth={720} />
        <Steps>
          <Step number={1} title={<><Ui>新しいパスワード</Ui> <Mark>1</Mark> に、これから使うパスワードを入力します</>}>
            <Callout kind="point" title="パスワードの条件">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>半角の英字と数字だけ</strong>を使ってください（記号・全角文字・空白は使えません）
                </li>
                <li>
                  <strong>8 文字以上</strong>にしてください
                </li>
                <li>例：<code className="rounded bg-white px-1.5 py-0.5">Sample2026</code>（実際にはご自身で考えたものにしてください）</li>
              </ul>
            </Callout>
          </Step>
          <Step number={2} title={<><Ui>確認用パスワード</Ui> <Mark>2</Mark> に、同じパスワードをもう一度入力します</>}>
            <p>2 つが一致していないと「新しいパスワードと一致しません」と表示されます。</p>
          </Step>
          <Step number={3} title={<><Ui>新しいパスワードを設定</Ui> <Mark>3</Mark> を押します</>}>
            <p>
              設定が終わると、そのままログインした状態になり、<DocLink href="/docs/dashboard">ダッシュボード</DocLink>（ホーム画面）が表示されます。
              次回からは、メールアドレスと<strong>新しいパスワード</strong>でログインします。
            </p>
          </Step>
        </Steps>
        <Callout kind="tip">
          <p>
            新しいパスワードは、ほかの人に分からないように管理してください。忘れてしまった場合は、ご自身で再設定できます（
            <DocLink href="/docs/login#forgot">パスワードを忘れたとき</DocLink>）。
          </p>
        </Callout>
        <Callout kind="info" title="「設定セッションの有効期限が切れました」と表示されたら">
          <p>
            ログインしてからパスワード設定までに時間がかかると、このメッセージが表示されることがあります。
            もう一度ログイン画面から、メールアドレスと仮パスワードでログインし直してください。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
