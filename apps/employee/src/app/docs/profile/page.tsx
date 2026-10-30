import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, FieldTable, Mark, PrevNext, Section, Shot, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "登録情報を変更する" };

const HREF = "/docs/profile";

export default function ProfileDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            氏名・住所・電話番号・メールアドレスを、ご自身で変更できます。住所と電話番号は、ポイント交換で商品をお届けするときの<strong>お届け先・連絡先</strong>になります。
            引っ越しや電話番号の変更があったら、忘れずに更新してください。
          </>
        }
        goals={["登録情報の変更の手順", "郵便番号からの住所の自動入力", "変更できない項目"]}
      />

      <Section id="edit" title="登録情報を変更する">
        <Steps>
          <Step number={1} title={<>ダッシュボードの <Ui>登録情報変更</Ui> を押します</>}>
            <Shot name="dashboard-links" alt="ダッシュボードの登録情報変更のボタン" />
            <p>
              ポイント交換の申請画面（交換申請の確認）の <Ui>編集</Ui>・<Ui>登録</Ui> からも同じ画面が開きます。
            </p>
          </Step>
          <Step number={2} title="内容を入力します">
            <Shot name="profile-dialog" alt="登録情報変更のダイアログ" />
            <FieldTable
              rows={[
                { name: "姓・名", required: true, description: "お名前です。" , example: "佐藤　花子" },
                { name: "姓フリガナ・名フリガナ", required: true, description: "全角カタカナで入力します。", example: "サトウ　ハナコ" },
                { name: "郵便番号", required: false, description: (
                    <>
                      前半 3 けたと後半 4 けたに分けて入力します。入力後に <Ui>自動入力</Ui> を押すと、都道府県・市区町村・丁目・番地が自動で入ります。
                    </>
                  ), example: "500-8384" },
                { name: "都道府県・市区町村・丁目・番地", required: false, description: "お届け先の住所です。ポイント交換を申請するときには必須になります。", example: "岐阜県 岐阜市 薮田南2-1-1" },
                { name: "建物名・部屋番号", required: false, description: "マンション名・部屋番号などがあれば入力します。" },
                { name: "メールアドレス", required: true, description: "お知らせメールの宛先で、ログインにも使います。変更すると、次回からは新しいメールアドレスでログインします。" },
                { name: "電話番号", required: false, description: "数字とハイフンで入力します（10 けたまたは 11 けた）。ポイント交換を申請するときには必須になります。", example: "090-1234-5678" },
              ]}
            />
          </Step>
          <Step number={3} title={<><Mark>1</Mark> <Ui>更新</Ui> を押します</>}>
            <p>入力に不足や誤りがあると、その項目の下に赤い文字で理由が表示されます。直してからもう一度 <Ui>更新</Ui> を押してください。</p>
          </Step>
        </Steps>
        <Callout kind="caution" title="メールアドレスの変更は慎重に">
          <p>
            メールアドレスはログイン ID です。変更すると、<strong>次回からは新しいメールアドレスでログイン</strong>することになります。
            受信できないメールアドレスにしてしまうと、パスワードの再設定ができなくなりますのでご注意ください。
            すでにほかの人が使っているメールアドレスには変更できません。
          </p>
        </Callout>
        <Callout kind="info" title="変更できない項目">
          <p>
            所属部署・権限・入社日は、ご自身では変更できません。変更が必要な場合は会社の管理者にご相談ください。
            管理者は <strong>ユーザー管理</strong> の画面からこれらを変更できます。
          </p>
        </Callout>
      </Section>

      <Section id="delivery" title="ポイント交換に必要な登録">
        <p>
          商品・サービスの交換を申請するには、<strong>郵便番号・都道府県・市区町村・丁目/番地・電話番号</strong>の登録が必要です。
          未登録のまま申請しようとすると、申請画面に赤い注意書きが出て先に進めません。あらかじめ登録しておくと、申請がスムーズです（<DocLink href="/docs/exchange#request">交換を申請する</DocLink>）。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
