import type { Metadata } from "next";

import { ChapterHeader, DocLink, PrevNext, Section, StatusChip, Ui } from "../_components/content";

export const metadata: Metadata = { title: "よくある質問" };

const HREF = "/docs/faq";

type Faq = { q: string; a: React.ReactNode };

const GROUPS: { title: string; id: string; items: Faq[] }[] = [
  {
    title: "ログイン",
    id: "login",
    items: [
      {
        q: "招待メールが届きません。",
        a: (
          <>
            迷惑メールフォルダをご確認ください。送信元は「no-reply@correcre.jp」です。見つからない場合は、会社の管理者に登録されているメールアドレスが正しいかを確認し、招待メールの再送を依頼してください。
          </>
        ),
      },
      {
        q: "仮パスワードでログインできません。",
        a: (
          <>
            仮パスワードの有効期限（メール受信から 7 日間）が切れている可能性があります。会社の管理者に招待メールの再送をご依頼ください。
            コピーして貼り付けるときに、前後に空白が入っていないかもご確認ください。
          </>
        ),
      },
      {
        q: "新しいパスワードが設定できません。",
        a: (
          <>
            パスワードは<strong>半角の英字と数字だけで 8 文字以上</strong>にしてください。記号（! や @ など）や全角文字は使えません。
          </>
        ),
      },
      {
        q: "パスワードを忘れました。",
        a: (
          <>
            ログイン画面の「パスワードを忘れた方は こちら」から、ご自身で再設定できます（<DocLink href="/docs/login#forgot">手順</DocLink>）。
          </>
        ),
      },
      {
        q: "しばらく使っていなかったら、ログイン画面に戻っていました。",
        a: (
          <>
            安全のため、2 日間（48 時間）操作がないと自動でログアウトされます。もう一度ログインしてください（<DocLink href="/docs/login#login">くわしく</DocLink>）。
          </>
        ),
      },
      {
        q: "「従業員権限がないため、ログインできません」と表示されます。",
        a: <>このアプリは従業員向けです。管理者としてだけ登録されている場合は、管理者向けのアプリ（admin.correcre.jp）をお使いください。分からない場合は会社の管理者にご確認ください。</>,
      },
    ],
  },
  {
    title: "ミッション・点数",
    id: "mission",
    items: [
      {
        q: "ミッションのカードが表示されません。",
        a: <>会社がまだミッションを登録していないか、すべてのミッションが無効になっている可能性があります。会社の管理者にご確認ください。</>,
      },
      {
        q: "「報告する」が押せず、「達成済み」になっています。",
        a: <>そのミッションは、今月の上限回数まで報告が済んでいます。翌月 1 日になると、また報告できるようになります。</>,
      },
      {
        q: "間違えて報告してしまいました。",
        a: <>ご自身では取り消せません。会社の管理者にご連絡ください。</>,
      },
      {
        q: "報告したのに「今月の獲得点数」が増えません。",
        a: <>画面を再読み込み（更新）してみてください。それでも増えない場合は、報告の送信が完了していない可能性があります。ミッションのカードの回数が増えているかを確認してください。</>,
      },
      {
        q: "画像が添付できません。",
        a: <>JPEG・PNG・GIF・WebP・HEIC 形式で、1 枚 10MB 以下の画像を選んでください。サイズが大きい写真は、スマートフォンの設定で小さくしてから添付してください。</>,
      },
    ],
  },
  {
    title: "ポイント",
    id: "points",
    items: [
      {
        q: "ポイントがいつ使えるようになるのか分かりません。",
        a: (
          <>
            今月の報告でもらったポイントは「翌月反映予定」に入り、<strong>翌月 1 日</strong>に「現在の保有ポイント」に加わります（<DocLink href="/docs/points#timing">くわしく</DocLink>）。
          </>
        ),
      },
      {
        q: "点数が同じなのに、同僚とポイントが違います。",
        a: <>点数からポイントへの換算は会社ごとに決まっており、同じ会社なら同じ計算です。入社月や、過去の管理者によるポイント調整などで差が出ることがあります。気になる場合は会社の管理者にご確認ください。</>,
      },
      {
        q: "ポイントに有効期限はありますか？",
        a: <>通常はありません。使わなかったポイントは翌月以降に持ち越されます。会社の運用で決まりがある場合は、会社の案内に従ってください。</>,
      },
      {
        q: "メニューに「ポイント交換」がありません。",
        a: <>ポイント交換の機能は、会社の設定で有効になっている場合だけ表示されます。会社の管理者にご確認ください。</>,
      },
    ],
  },
  {
    title: "ポイント交換",
    id: "exchange",
    items: [
      {
        q: "「ポイントで交換する」が押せません。",
        a: <>保有ポイントが必要ポイントに足りていません。ボタンの下に不足分が表示されます。「翌月反映予定」のポイントは、翌月 1 日まで使えません。</>,
      },
      {
        q: "「申請する」が押せません。",
        a: (
          <>
            お届け先・連絡先（郵便番号・都道府県・市区町村・丁目/番地・電話番号）が未登録です。確認画面の <Ui>登録</Ui> から入力してください（<DocLink href="/docs/profile">登録情報を変更する</DocLink>）。
          </>
        ),
      },
      {
        q: "申請したあと、何をすればよいですか？",
        a: (
          <>
            配送の商品でお届け日の調整があるものは、候補が届いたらお届け日を選びます。予約が必要なサービスは、承認後にご自身で予約します。それ以外は、提携企業からの発送を待つだけです。
            状態は <DocLink href="/docs/exchange-history">交換履歴</DocLink> で確認できます。
          </>
        ),
      },
      {
        q: "申請を取り消したいです。",
        a: (
          <>
            お届け日の調整がある商品は、お届け日が確定する前なら交換の画面の <Ui>交換をキャンセルする</Ui> から取り消せます。それ以外は提携企業または会社の管理者にご相談ください。
            取り消されると、ポイントは全額戻ります。
          </>
        ),
      },
      {
        q: "状態が「申請中」のまま変わりません。",
        a: (
          <>
            提携企業が内容を確認中です。数日たっても <StatusChip status="申請中" /> のままの場合は、会社の管理者を通じてコレクレ運営にお問い合わせください。
          </>
        ),
      },
      {
        q: "お届け日の候補が、どれも都合が合いません。",
        a: (
          <>
            候補の下の <Ui>この中に受け取れる日がない（希望日を伝える）</Ui> から、希望日を伝えられます（1 つの交換につき 2 回まで）。
            提携企業が対応できる場合は、その日で確定します（<DocLink href="/docs/delivery-schedule#request">くわしく</DocLink>）。
          </>
        ),
      },
      {
        q: "お届け日を過ぎても商品が届きません。",
        a: (
          <>
            交換の画面の <Ui>届いていない</Ui> から提携企業に連絡してください。送り状番号が登録されている場合は、配送会社のサイトでも状況を確認できます。
          </>
        ),
      },
      {
        q: "予約が必要なサービスで、予約ページが表示されません。",
        a: <>予約先と交換番号は、提携企業が申請を承認したあとに表示されます。承認されるまでお待ちください。承認されるとメールでもお知らせします。</>,
      },
    ],
  },
  {
    title: "登録情報",
    id: "profile",
    items: [
      {
        q: "部署や名前の表記を直してほしいです。",
        a: <>氏名はご自身で変更できます（ダッシュボードの「登録情報変更」）。部署の変更は会社の管理者にご依頼ください。</>,
      },
      {
        q: "メールアドレスを変えたら、ログインできなくなりました。",
        a: <>メールアドレスはログイン ID のため、変更後は新しいメールアドレスでログインします。新しいメールアドレスでもログインできない場合は、会社の管理者にご相談ください。</>,
      },
    ],
  },
];

export default function FaqDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            よくいただく質問と、その答えをまとめました。ここで解決しない場合は、<strong>会社の管理者</strong>にご相談ください。管理者からコレクレ運営に問い合わせることができます。
          </>
        }
      />

      <div className="mt-8 flex flex-wrap gap-2">
        {GROUPS.map((group) => (
          <a
            key={group.id}
            href={`#${group.id}`}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-800"
          >
            {group.title}
          </a>
        ))}
      </div>

      {GROUPS.map((group) => (
        <Section key={group.id} id={group.id} title={group.title}>
          <div className="space-y-3">
            {group.items.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
                    Q
                  </span>
                  <span className="flex-1 pt-0.5 font-bold text-slate-900">{item.q}</span>
                  <span className="pt-1 text-slate-400 transition group-open:rotate-180">▼</span>
                </summary>
                <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
                    A
                  </span>
                  <div className="flex-1 pt-0.5 leading-8 text-slate-700">{item.a}</div>
                </div>
              </details>
            ))}
          </div>
        </Section>
      ))}

      <PrevNext href={HREF} />
    </article>
  );
}
