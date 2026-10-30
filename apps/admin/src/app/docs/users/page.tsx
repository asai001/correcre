import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, FieldTable, Mark, PrevNext, Section, Shot, StatusChip, Step, Steps, SubSection, Ui } from "../_components/content";

export const metadata: Metadata = { title: "従業員を登録・招待する" };

const HREF = "/docs/users";

export default function UsersDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            <strong>ユーザー管理</strong>は、従業員の登録と招待を行う画面です。登録すると、従業員には仮パスワード付きの招待メールが自動で届きます。
            従業員が初回ログインを済ませると「有効」になり、ミッションの報告ができるようになります。
          </>
        }
        goals={["ユーザー管理画面の見かた", "従業員の登録と招待メール", "「招待中」「有効」「休止中」などの状態の意味", "招待メールの再送と CSV 出力"]}
      />

      <Section id="overview" title="画面全体">
        <Shot name="users" alt="ユーザー管理画面の全体" caption="ユーザー管理の全体（表示内容はサンプルです）" />
        <Shot name="users-toolbar" alt="ユーザー登録・部署管理・CSV出力のボタンと、検索欄・部署の絞り込み" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Mark>1</Mark> <Ui>ユーザー登録</Ui>：新しい従業員を登録します（下の手順）。
          </li>
          <li>
            <Mark>2</Mark> <Ui>部署管理</Ui>：部署の追加・名称変更・削除（<DocLink href="/docs/departments">部署を管理する</DocLink>）。
          </li>
          <li>
            <Mark>3</Mark> <Ui>CSV 出力</Ui>：いま表示している一覧を CSV ファイルに保存します。
          </li>
          <li>
            <Mark>4</Mark> 検索欄：氏名・フリガナ・メールアドレス・電話番号・部署などの一部を入力すると、一覧が絞り込まれます。右の <Ui>全部署</Ui> で部署ごとに絞り込めます。
          </li>
        </ul>
        <p>
          その下には会社名・平均達成率・招待中の人数・未連携の人数と、<strong>ユーザー数・部署数・ユーザーポイント・会社ポイント残高</strong>のカードが並びます。
        </p>
      </Section>

      <Section id="register" title="従業員を登録する">
        <Steps>
          <Step number={1} title={<><Ui>ユーザー登録</Ui> を押します</>}>
            <p>「ユーザー登録」の入力画面が開きます。</p>
          </Step>
          <Step number={2} title="従業員の情報を入力します">
            <Shot name="users-register" alt="ユーザー登録のダイアログ" />
            <FieldTable
              rows={[
                { name: "姓・名", required: true, description: "従業員のお名前です。", example: "鈴木　一郎" },
                { name: "姓フリガナ・名フリガナ", required: true, description: "全角カタカナで入力します。", example: "スズキ　イチロウ" },
                { name: "所属部署", required: true, description: (
                    <>
                      登録済みの部署から選びます。<strong>新しい部署名を入力すると、登録と同時に部署も追加</strong>されます。
                    </>
                  ) },
                { name: "権限", required: true, description: (
                    <>
                      <strong>従業員</strong>（ミッション報告をする人）か<strong>管理者</strong>（この画面を使う人）か、または両方を選びます。ふつうの従業員は「従業員」だけにします。
                    </>
                  ) },
                { name: "入社日", required: false, description: "登録した日が自動で入ります（あとから編集画面で変更できます）。" },
                { name: "メールアドレス", required: true, description: "ログイン ID になり、招待メールの宛先にもなります。ほかの人と同じメールアドレスは登録できません。" },
                { name: "電話番号", required: false, description: "数字とハイフンで 10 けたまたは 11 けた。", example: "090-1234-5678" },
                { name: "都道府県・郵便番号・市区町村・丁目・番地・建物名", required: false, description: "住所です。ポイント交換で商品を受け取るときのお届け先になります。従業員本人があとから登録することもできます。" },
              ]}
            />
          </Step>
          <Step number={3} title={<><Mark>1</Mark> <Ui>登録</Ui> を押します</>}>
            <p>
              「◯◯ を登録しました。招待メールを送信しています。」と表示され、一覧に <StatusChip status="招待中" /> として追加されます。
              従業員には件名「【コレクレ】アカウント登録のご案内」のメールが届き、仮パスワードでログインして新しいパスワードを設定すると <StatusChip status="有効" /> に変わります。
            </p>
          </Step>
        </Steps>
        <Callout kind="tip" title="従業員への案内">
          <p>
            従業員向けの操作ガイド（<strong>https://app.correcre.jp/docs</strong>）を、招待のときにあわせてお知らせください。初回ログインから毎日の報告まで、画面付きで説明しています。
          </p>
        </Callout>
        <Callout kind="caution" title="仮パスワードの有効期限は 7 日間です">
          <p>
            招待メールの仮パスワードは、送信から <strong>7 日間</strong>で使えなくなります。期限が切れた従業員は、一覧に <StatusChip status="仮パスワード期限切れ" /> と表示されます。
            下の「招待メールを再送する」の手順で、新しい仮パスワードを送ってください。
          </p>
        </Callout>
      </Section>

      <Section id="list" title="一覧の見かた">
        <Shot name="users-list" alt="ユーザー一覧の表。氏名、部署・権限・状態、連絡先、ポイント、操作" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>氏名</strong>：お名前・フリガナ・ユーザー ID・入社日。
          </li>
          <li>
            <strong>部署 / 権限 / 状態</strong>：部署名、権限（従業員・管理者）、状態、認証連携のバッジが並びます（意味は下の表）。
          </li>
          <li>
            <strong>連絡先</strong>：メールアドレス・電話番号・住所・最終ログイン日時。
          </li>
          <li>
            <strong>ポイント</strong>：いま使えるポイント、翌月反映予定のポイント、今月の達成率。
          </li>
          <li>
            <strong>操作</strong>：<Mark>1</Mark> 鉛筆のマークで編集（<DocLink href="/docs/user-edit">ユーザー情報の編集とポイント調整</DocLink>）。仮パスワード期限切れの人には <Mark>2</Mark> 紙飛行機のマーク（招待メールを再送）も表示されます。
          </li>
        </ul>
        <SubSection title="状態のバッジの意味">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="w-48 px-4 py-3 font-bold">表示</th>
                  <th className="px-4 py-3 font-bold">意味</th>
                </tr>
              </thead>
              <tbody className="align-top leading-7">
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-3"><StatusChip status="招待中" /></td>
                  <td className="px-4 py-3">登録済みで、まだ初回ログインをしていない人です。招待メールの仮パスワードでログインすると「有効」になります。</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-3"><StatusChip status="有効" /></td>
                  <td className="px-4 py-3">ふだんどおり使える人です。管理対象従業員数・ID 料金の人数に含まれます。</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-3"><StatusChip status="休止中" /></td>
                  <td className="px-4 py-3">休職・退職などで利用を止めている人です。ログインできず、人数にも含まれません。休止・再開の切り替えは運用者が行います。</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-3"><StatusChip status="仮パスワード期限切れ" /></td>
                  <td className="px-4 py-3">招待中のまま 7 日が過ぎ、仮パスワードが使えなくなった人です。招待メールを再送してください。</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-3"><StatusChip status="連携済み" /> <StatusChip status="未連携" /></td>
                  <td className="px-4 py-3">ログインの仕組みとの連携状態です。<strong>未連携</strong>の人はログインできないため、画面上部に赤い注意が出ます。至急 <DocLink href="/docs/support">運用者にお問い合わせ</DocLink>ください。</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SubSection>
        <p>
          一覧の下の <Ui>表示件数</Ui> で 1 ページに表示する人数（8・12・24）を変えられます。
        </p>
      </Section>

      <Section id="resend" title="招待メールを再送する">
        <Steps>
          <Step number={1} title={<>一覧で <StatusChip status="仮パスワード期限切れ" /> の人の行の、紙飛行機のマークを押します</>}>
            <Shot name="users-row-expired" alt="仮パスワード期限切れのユーザーの行。操作列に再送アイコンがある" />
          </Step>
          <Step number={2} title={<>内容を確認して <Mark>1</Mark> <Ui>再送する</Ui> を押します</>}>
            <Shot name="users-resend" alt="招待メールを再送の確認ダイアログ" maxWidth={640} />
            <p>
              新しい仮パスワードを書いた招待メールが届きます。<strong>以前の仮パスワードは使えなくなります</strong>ので、従業員には新しいメールを見るよう伝えてください。
            </p>
          </Step>
        </Steps>
        <Callout kind="info" title="期限内なのにログインできないと言われたら">
          <p>
            再送のボタンは、期限が切れた人にだけ表示されます。期限内の場合は、メールの迷惑メールフォルダの確認、仮パスワードの前後の空白、メールアドレスの入力ミスをまず確認してもらってください。
            それでも解決しない場合は、運用者にお問い合わせください。
          </p>
        </Callout>
      </Section>

      <Section id="csv" title="一覧を CSV に保存する">
        <p>
          <Ui>CSV 出力</Ui> を押すと、<strong>いま表示している（検索・部署で絞り込んだあとの）</strong>一覧が CSV ファイルとしてダウンロードされます。
          氏名・部署・権限・状態・連絡先・住所・ポイント・達成率・入社日・最終ログインが含まれます。Excel などで開けます。
        </p>
        <Callout kind="caution">
          <p>CSV には従業員の個人情報が含まれます。取り扱いにはご注意ください。</p>
        </Callout>
      </Section>

      <Section id="remove" title="退職した従業員の扱い">
        <p>
          この画面から従業員を削除したり、休止中にしたりすることはできません。退職などで利用を止めたい場合は、
          <DocLink href="/docs/support">運用者にお問い合わせ</DocLink>ください（カテゴリは「アカウント・権限」）。休止中にすると、翌月以降の ID 料金の人数から外れます。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
