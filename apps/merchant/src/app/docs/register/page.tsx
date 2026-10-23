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
  Step,
  Steps,
  Ui,
} from "../_components/content";

export const metadata: Metadata = { title: "提携企業の登録申請" };

const HREF = "/docs/register";

export default function RegisterDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            コレクレをご利用いただくには、まず Web の申込フォームから<strong>「登録申請」</strong>を行います。
            入力はおよそ 5〜10 分で終わります。ログインは不要です。
          </>
        }
        goals={["申込フォームの開き方", "各項目に何を入力すればよいか", "申請したあとに何が起きるか"]}
      />

      <Section id="open" title="申込フォームを開く">
        <Steps>
          <Step number={1} title="ログイン画面を開きます">
            <p>
              パソコンのブラウザで、コレクレ提携企業のログイン画面（<strong>https://merchant.correcre.jp/login</strong>）を開きます。
            </p>
          </Step>
          <Step number={2} title="「初めてご利用の方は こちら」の「こちら」を押します">
            <Shot name="login-register-link" alt="ログイン画面。初めてご利用の方はこちらのリンクが赤枠で囲まれている" maxWidth={720} />
            <p>
              申込フォーム（<Ui>提携企業 新規会員登録</Ui>）が開きます。直接 <strong>https://merchant.correcre.jp/register</strong> を開いても構いません。
            </p>
          </Step>
        </Steps>
        <Shot name="register-empty" alt="提携企業 新規会員登録の申込フォーム（未入力）" caption="申込フォームの全体。上から順に入力していきます。" maxWidth={720} />
      </Section>

      <Section id="company" title="会社情報を入力する">
        <Shot name="register-company" alt="会社情報の入力欄" maxWidth={760} />
        <p>
          項目名の後ろに <strong>「*」</strong> が付いているものは必ず入力してください（必須項目）。
        </p>
        <FieldTable
          rows={[
            { name: "会社名", required: true, description: "正式な会社名（屋号）を入力します。", example: "株式会社サンプル製菓" },
            { name: "会社名（カナ）", description: "会社名の読み方をカタカナで入力します。", example: "カブシキガイシャサンプルセイカ" },
            { name: "会社所在地", required: true, description: "会社の住所を入力します。", example: "岐阜県岐阜市サンプル町1-2-3" },
            {
              name: "店舗住所",
              required: true,
              description: (
                <>
                  一覧から選びます。店舗が会社と同じ場所なら <Ui>会社と同じ</Ui>、店舗が無いなら <Ui>店舗無し</Ui>、
                  別の場所にあるなら <Ui>その他</Ui> を選び、下に出てくる <Ui>店舗住所（その他）</Ui> に店舗の住所を入力します。
                </>
              ),
            },
            {
              name: "お客様お問い合わせ先",
              required: true,
              description: "申請者（商品を受け取る方）からの問い合わせ先です。電話番号・メールアドレス・URL など。",
              example: "TEL 058-000-0000（平日 9:00〜17:00）",
            },
          ]}
        />
        <Shot name="register-store-select" alt="店舗住所の選択肢（会社と同じ・店舗無し・その他）が開いている画面" caption="「店舗住所」の欄を押すと、選択肢が表示されます。" maxWidth={720} />
      </Section>

      <Section id="contact" title="担当者情報を入力する">
        <Shot name="register-contact" alt="担当者情報の入力欄" maxWidth={760} />
        <FieldTable
          rows={[
            { name: "姓・名", required: true, description: "このシステムを主に操作する担当者さまのお名前です。", example: "山田 太郎" },
            { name: "姓（カナ）・名（カナ）", description: "お名前の読み方をカタカナで入力します。", example: "ヤマダ タロウ" },
            { name: "担当者電話番号", required: true, description: "日中につながる電話番号を入力します。", example: "058-000-0000" },
            {
              name: "担当者メールアドレス",
              required: true,
              description: (
                <>
                  <strong>このメールアドレスがログインID になります。</strong>審査結果や、交換申請のお知らせもここに届きます。
                  ふだん確認しているメールアドレスを入力してください。
                </>
              ),
              example: "yamada@example.com",
            },
          ]}
        />
        <Callout kind="caution">
          <p>
            メールアドレスの入力ミスがあると、ログインに必要なメールが届きません。送信前にもう一度ご確認ください。
            すでにコレクレ提携企業として登録済みのメールアドレスは使えません（「入力されたメールアドレスはすでに使用されています」と表示されます）。
          </p>
        </Callout>
      </Section>

      <Section id="payment" title="支払い情報を入力する（任意）">
        <Shot name="register-payment" alt="支払い情報（任意）の入力欄" maxWidth={760} />
        <FieldTable
          rows={[
            {
              name: "振込口座",
              description: "売上をお振り込みする口座です。銀行名・支店名・種別・口座番号・口座名義をまとめて入力します。",
              example: "サンプル銀行 岐阜支店 普通 1234567 カ）サンプルセイカ",
            },
            { name: "支払サイクル", description: "ご希望の支払サイクルがあれば入力します。", example: "月末締め・翌月末払い" },
          ]}
        />
        <Callout kind="tip">
          <p>
            支払い情報は空欄のままでも申請できます。あとからログインして <DocLink href="/docs/company-info">会社情報</DocLink>{" "}
            の画面で入力・変更できます。
          </p>
        </Callout>
      </Section>

      <Section id="submit" title="規約に同意して申請する">
        <Shot name="register-submit" alt="規約への同意チェックと登録申請ボタン" maxWidth={760} />
        <Steps>
          <Step number={1} title={<>青い文字の <Ui>コレクレ アイテム提携企業向け規約</Ui> を押して、規約を確認します</>}>
            <p>規約は別のタブで開きます。読み終わったら、元のタブ（申込フォーム）に戻ってください。</p>
          </Step>
          <Step number={2} title={<>規約の左にある四角 <Mark>4</Mark> を押して、チェックを入れます</>}>
            <p>チェックを入れないと申請できません。</p>
          </Step>
          <Step number={3} title={<><Ui>登録申請</Ui> ボタン <Mark>5</Mark> を押します</>}>
            <p>入力漏れがあると、その項目に「このフィールドを入力してください」などのメッセージが出ます。入力してから、もう一度押してください。</p>
          </Step>
        </Steps>
        <Shot name="register-filled" alt="すべて入力し終えた申込フォーム" caption="入力例。すべて入力し終えた状態です。" maxWidth={720} />
      </Section>

      <Section id="after" title="申請したあとの流れ">
        <p>申請が受け付けられると、次の画面が表示されます。</p>
        <Shot name="register-complete" alt="登録申請を受け付けましたという完了画面" maxWidth={720} />
        <p>
          あわせて、入力したメールアドレスに <strong>「【コレクレ】提携企業登録申請を受け付けました」</strong> というメールが届きます。
        </p>
        <Shot name="email-accepted" alt="登録申請を受け付けましたというメールの例" maxWidth={640} />
        <p>
          このあと、コレクレの運用者が申請内容を確認します。<strong>確認が終わると「【コレクレ】アカウント登録のご案内」というメールが届きます。</strong>
          このメールに書かれた仮パスワードで最初のログインを行います。手順は次の章で説明します。
        </p>
        <Callout kind="info" title="メールが届かないときは">
          <ul className="list-disc space-y-1 pl-5">
            <li>迷惑メールフォルダに入っていないか確認してください。</li>
            <li>メールの受信制限（ドメイン指定受信など）をしている場合は、コレクレからのメールを受信できるよう設定してください。</li>
            <li>数日たっても審査結果のメールが届かない場合は、コレクレ運営までお問い合わせください。</li>
          </ul>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
