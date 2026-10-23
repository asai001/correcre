import type { Metadata } from "next";

import { Callout, ChapterHeader, FieldTable, Mark, PrevNext, Section, Shot, Ui } from "../_components/content";

export const metadata: Metadata = { title: "会社情報の確認・変更" };

const HREF = "/docs/company-info";

export default function CompanyInfoDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            登録申請で入力した会社情報や、売上の振込先を確認・変更する画面です。管理者のユーザーだけが開けます。
          </>
        }
        goals={["登録内容の確認", "表示名・振込先などの変更"]}
      />

      <Section id="edit" title="会社情報を変更する">
        <p>
          上部メニューの <Ui>会社情報</Ui> を押すと、登録内容が表示されます。変更したい項目を書き換えて、
          最後に <Mark>1</Mark> <Ui>会社情報を保存</Ui> を押してください。「会社情報を更新しました」と表示されれば完了です。
        </p>
        <Shot name="company-info" alt="会社情報の画面" />
        <FieldTable
          rows={[
            { name: "会社ID・最終更新日時", description: "自動で表示されます。変更はできません。運用者へのお問い合わせの際に会社IDを伝えるとスムーズです。" },
            { name: "提携企業名", required: true, description: "正式な会社名です。" },
            {
              name: "表示名",
              description: "申請者の商品一覧などに表示される名前です。店舗名・ブランド名があれば入力してください。空欄の場合は会社名が表示されます。",
              example: "サンプル洋菓子店",
            },
            { name: "会社所在地・店舗住所", required: true, description: "登録申請のときと同じです。店舗住所で「その他」を選ぶと、表示用の住所を入力できます。" },
            { name: "お客様からの問い合わせ先", required: true, description: "申請者からの問い合わせを受ける連絡先です。" },
            { name: "担当者名・担当者電話番号", required: true, description: "会社の代表の担当者です。" },
            { name: "代表メールアドレス", description: "会社の代表のメールアドレスです。" },
            { name: "入金サイクル・お振込先", description: "売上の振込先口座などです。変更があったら早めに更新してください。" },
          ]}
        />
        <Callout kind="info">
          <p>
            ここで担当者名や代表メールアドレスを変えても、<strong>ログインに使うメールアドレスは変わりません</strong>。
            ログインに使うメールアドレスを変えたい場合は、運用者にお問い合わせください。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
