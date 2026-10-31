import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Step, Steps, Ui } from "../_components/content";

export const metadata: Metadata = { title: "ユーザー情報の編集とポイント調整" };

const HREF = "/docs/user-edit";

export default function UserEditDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            登録済みの従業員の氏名・部署・権限・連絡先・利用開始日を変更する手順と、<strong>ポイントを手動で増減（調整）</strong>する手順です。
            従業員本人も、氏名・住所・連絡先は従業員向けアプリから変更できます。
          </>
        }
        goals={["ユーザー情報の変更の手順", "権限（従業員・管理者）の変更", "ポイント調整の使い方と注意点"]}
      />

      <Section id="edit" title="ユーザー情報を変更する">
        <Steps>
          <Step number={1} title={<>ユーザー管理の一覧で、変更したい人の行の<strong>鉛筆のマーク</strong>を押します</>}>
            <Shot name="users-list" alt="ユーザー一覧の操作列の編集アイコン" />
          </Step>
          <Step number={2} title="内容を変更します">
            <Shot name="users-edit" alt="ユーザー編集のダイアログ" />
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <Mark>1</Mark> 画面の上部に、この人の<strong>認証連携</strong>の状態が表示されます。「未連携」の場合はログインできないため、運用者にお問い合わせください。
              </li>
              <li>
                <Mark>2</Mark> 氏名・フリガナ・所属部署・権限・利用開始日・メールアドレス・電話番号・住所を変更できます。入力のルールは <DocLink href="/docs/users#register">従業員を登録する</DocLink> と同じです。
              </li>
              <li>
                郵便番号を入力して <Ui>自動入力</Ui> を押すと、都道府県・市区町村・丁目・番地が自動で入ります。
              </li>
            </ul>
          </Step>
          <Step number={3} title={<><Mark>3</Mark> <Ui>更新</Ui> を押します</>}>
            <p>「◯◯ を更新しました」と表示され、一覧に反映されます。</p>
          </Step>
        </Steps>
        <Callout kind="caution" title="メールアドレスの変更は慎重に">
          <p>
            メールアドレスはログイン ID です。変更すると、その従業員は<strong>次回から新しいメールアドレスでログイン</strong>することになります。
            本人に必ず伝えてください。受信できないメールアドレスにすると、パスワードの再設定ができなくなります。
          </p>
        </Callout>
      </Section>

      <Section id="roles" title="権限（従業員・管理者）について">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-32 px-4 py-3 font-bold">権限</th>
                <th className="px-4 py-3 font-bold">使えるアプリ・できること</th>
              </tr>
            </thead>
            <tbody className="align-top leading-7">
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold">従業員</td>
                <td className="px-4 py-3">従業員向けアプリ（app.correcre.jp）。ミッションの報告、ポイント交換、過去の実績の確認。</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3 font-bold">管理者</td>
                <td className="px-4 py-3">管理者向けアプリ（admin.correcre.jp）。このガイドで説明しているすべての画面。</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc space-y-2 pl-6">
          <li>両方にチェックを入れると、両方のアプリにログインできます（管理者自身がミッションに参加する場合など）。</li>
          <li>
            「従業員」のチェックを外すと、その人は従業員向けアプリにログインできなくなり、分析・レポートの対象からも外れます。
          </li>
          <li>権限は 1 つ以上選ぶ必要があります。「運用者」の権限は、この画面からは付けられません。</li>
        </ul>
      </Section>

      <Section id="points" title="ポイントを調整する">
        <p>
          表彰などで特別にポイントを贈りたいとき、または誤って付与されたポイントを取り消したいときに使います。
          ユーザー編集の画面の下部にある<strong>ポイント調整</strong>の欄で行います。
        </p>
        <Shot name="users-edit-points" alt="ポイント調整の欄。現在ポイント、翌月反映予定、調整値、調整後ポイント" />
        <Steps>
          <Step number={1} title={<><Mark>1</Mark> <Ui>調整値</Ui> に、増やす場合は正の数、減らす場合はマイナスを付けた数を入力します</>}>
            <p>
              例：500 ポイント加算なら <code className="rounded bg-slate-100 px-1.5 py-0.5">500</code>、200 ポイント減算なら <code className="rounded bg-slate-100 px-1.5 py-0.5">-200</code>。整数で入力します。
              <Mark>2</Mark> <Ui>調整後ポイント</Ui> に、反映後の値が自動で表示されます。
            </p>
          </Step>
          <Step number={2} title={<><Ui>更新</Ui> を押します</>}>
            <p>従業員の「現在の保有ポイント」がすぐに変わります。</p>
          </Step>
        </Steps>
        <Callout kind="point" title="調整の対象は「現在ポイント」です">
          <p>
            調整は、従業員がいま使える<strong>現在ポイント</strong>に対して行われます。<strong>翌月反映予定</strong>（今月の報告でもらったポイント）は調整できません。
            調整後のポイントが 0 未満になる減算はできません。
          </p>
        </Callout>
        <Callout kind="caution" title="会社ポイントとの関係">
          <p>
            従業員に加算したポイントは会社の保有ポイントから、減算したポイントは会社の保有ポイントへ、それぞれ移動します。
            会社ポイント残高を超える加算はできません。残高はユーザー管理の「会社ポイント残高」のカードで確認できます。
            従業員がその月に獲得しなかったポイントは、翌月 1 日に会社ポイントとして戻ります（<DocLink href="/docs/billing#point-return">会社ポイントへの還元</DocLink>）。
            成果の高い従業員への追加の付与などにお使いください。
            調整はやり直しがきかないため、金額と対象の従業員をよく確認してから <Ui>更新</Ui> を押してください。
          </p>
        </Callout>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
