import type { Metadata } from "next";

import { Callout, ChapterHeader, Mark, PrevNext, Section, Shot, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "ログイン・パスワードを忘れたとき" };

const HREF = "/docs/login";

export default function LoginDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={<>2 回目以降のログイン方法と、パスワードを忘れてしまったときの再設定の方法です。</>}
        goals={["ふだんのログインとログアウト", "自動でログアウトされるタイミング", "パスワードを忘れたときの再設定"]}
      />

      <Section id="login" title="ログインする">
        <Steps>
          <Step number={1} title="ログイン画面を開きます">
            <p>
              <strong>https://merchant.correcre.jp/login</strong> を開きます。よく使う場合は、ブラウザの「ブックマーク（お気に入り）」に登録しておくと便利です。
            </p>
          </Step>
          <Step number={2} title={<><Mark>1</Mark> メールアドレスと <Mark>2</Mark> パスワードを入力し、<Mark>3</Mark> <Ui>ログイン</Ui> を押します</>}>
            <Shot name="login-filled" alt="ログイン画面" maxWidth={720} />
          </Step>
        </Steps>
        <Callout kind="info" title="「ログイン情報を保存」について">
          <p>
            チェックを入れてログインすると、同じパソコン・ブラウザでは<strong>最長 30 日間</strong>ログインしたままになります。
            チェックを入れない場合は、ログインしてから 12 時間でログアウトされます。共用のパソコンではチェックを入れないでください。
          </p>
        </Callout>
        <Callout kind="caution" title="30 分間操作しないと、自動でログアウトされます">
          <p>
            安全のため、画面を開いたまま<strong>30 分ほど操作がない</strong>と自動でログアウトされます（「ログイン情報を保存」にチェックを入れていても同じです）。
            長い文章を入力するときは、こまめに保存してください。ログアウトされた場合は、もう一度ログインすれば続きから操作できます。
          </p>
        </Callout>
      </Section>

      <Section id="logout" title="ログアウトする">
        <p>
          どの画面でも、上部メニューの右側にある <Ui>ログアウト</Ui> を押すとログアウトできます。共用のパソコンでは、使い終わったら必ずログアウトしてください。
        </p>
        <Shot name="dashboard-header" alt="画面上部のメニュー。ログアウトボタンが2番で示されている" />
      </Section>

      <Section id="forgot" title="パスワードを忘れたとき">
        <p>パスワードは、メールに届く「認証コード」を使ってご自身で再設定できます。</p>
        <Steps>
          <Step number={1} title="ログイン画面の「パスワードを忘れた方は こちら」の「こちら」を押します">
            <Shot name="login-forgot-link" alt="ログイン画面のパスワードを忘れた方はこちらのリンク" maxWidth={720} />
          </Step>
          <Step number={2} title={<><Mark>1</Mark> にログインに使っているメールアドレスを入力し、<Mark>2</Mark> <Ui>認証コードを送信</Ui> を押します</>}>
            <Shot name="forgot-request" alt="パスワード再設定画面。メールアドレス入力欄と認証コードを送信ボタン" maxWidth={720} />
          </Step>
          <Step number={3} title="届いたメールの「確認コード」を確認します">
            <p>
              件名 <strong>「【コレクレ】パスワード再設定用コードのお知らせ」</strong> のメールが届きます。メールに書かれた 6 けたの数字が認証コードです。
            </p>
            <Shot name="email-reset" alt="パスワード再設定用コードのお知らせメールの例" maxWidth={640} />
            <Callout kind="caution">
              <p>
                認証コードの有効期限は<strong>60 分</strong>です。期限が切れた場合は、画面の <Ui>認証コードを再送</Ui> を押して、新しいコードを受け取ってください。
              </p>
            </Callout>
          </Step>
          <Step number={4} title="認証コードと新しいパスワードを入力して、再設定します">
            <Shot name="forgot-reset" alt="認証コード・新しいパスワード・確認用パスワードの入力欄とパスワードを再設定ボタン" maxWidth={720} />
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <Mark>3</Mark> <Ui>認証コード</Ui>：メールに書かれた数字
              </li>
              <li>
                <Mark>4</Mark> <Ui>新しいパスワード</Ui>：半角英数字 8 文字以上（記号は使えません）
              </li>
              <li>
                <Mark>5</Mark> <Ui>確認用パスワード</Ui>：同じパスワードをもう一度
              </li>
            </ul>
            <p>
              入力したら <Mark>6</Mark> <Ui>パスワードを再設定</Ui> を押します。ログイン画面に戻り「パスワードを再設定しました」と表示されたら完了です。新しいパスワードでログインしてください。
            </p>
          </Step>
        </Steps>
        <Callout kind="info" title="メールアドレスを忘れたとき">
          <p>ログインに使っているメールアドレスが分からない場合は、コレクレ運営までお問い合わせください。</p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
