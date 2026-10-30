import type { Metadata } from "next";

import { ChapterHeader, DocLink, PrevNext, Section, StatusChip } from "../_components/content";

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
        a: <>迷惑メールフォルダをご確認ください。送信元は「no-reply@correcre.jp」です。見つからない場合は、運用者にご連絡ください。</>,
      },
      {
        q: "仮パスワードでログインできません。",
        a: (
          <>
            仮パスワードの有効期限（メール受信から 7 日間）が切れている可能性があります。運用者、または社内のほかの管理者に招待メールの再送をご依頼ください。
            コピーして貼り付けるときに、前後に空白が入っていないかもご確認ください。
          </>
        ),
      },
      {
        q: "新しいパスワードが設定できません。",
        a: <>パスワードは<strong>半角の英字と数字だけで 8 文字以上</strong>にしてください。記号（! や @ など）や全角文字は使えません。</>,
      },
      {
        q: "作業中に、急にログイン画面に戻りました。",
        a: (
          <>
            安全のため、30 分ほど操作がないと自動でログアウトされます。もう一度ログインしてください。理念体系など長い入力をするときは、こまめに保存するのがおすすめです（
            <DocLink href="/docs/login#login">くわしく</DocLink>）。
          </>
        ),
      },
      {
        q: "パスワードを忘れました。",
        a: <>ログイン画面の「パスワードを忘れた方は こちら」から、ご自身で再設定できます（<DocLink href="/docs/login#forgot">手順</DocLink>）。</>,
      },
      {
        q: "従業員向けアプリにもログインしたいです。",
        a: (
          <>
            ご自身のユーザーの権限に「従業員」を追加すると、従業員向けアプリ（app.correcre.jp）にも同じメールアドレス・パスワードでログインできます（
            <DocLink href="/docs/user-edit#roles">権限について</DocLink>）。
          </>
        ),
      },
    ],
  },
  {
    title: "ユーザー管理",
    id: "users",
    items: [
      {
        q: "従業員が「招待中」のまま変わりません。",
        a: (
          <>
            従業員がまだ初回ログインをしていません。招待メールを確認してログインするよう伝えてください。7 日を過ぎて <StatusChip status="仮パスワード期限切れ" /> になった場合は、紙飛行機のマークから再送します（
            <DocLink href="/docs/users#resend">手順</DocLink>）。
          </>
        ),
      },
      {
        q: "「未連携」と表示され、従業員がログインできません。",
        a: <>ログインの仕組みとの連携が失われています。管理者側では直せないため、至急運用者にお問い合わせください（カテゴリ「アカウント・権限」）。</>,
      },
      {
        q: "退職した従業員を削除したいです。",
        a: (
          <>
            管理者の画面からは削除・休止にできません。運用者にお問い合わせください。休止中にすると、ログインできなくなり、翌月以降の ID 料金の人数から外れます（
            <DocLink href="/docs/users#remove">くわしく</DocLink>）。
          </>
        ),
      },
      {
        q: "従業員のメールアドレスを変更したら、ログインできないと言われました。",
        a: <>メールアドレスはログイン ID のため、変更後は新しいメールアドレスでログインします。従業員に新しいメールアドレスを伝えてください。</>,
      },
      {
        q: "同じ人を 2 回登録してしまいました。",
        a: <>同じメールアドレスは 2 回登録できないため、別のメールアドレスで登録されている状態です。不要なほうの休止・削除を運用者に依頼してください。</>,
      },
      {
        q: "部署が削除できません。",
        a: <>所属している従業員がいる部署は削除できません。先にユーザー編集で所属をほかの部署に変えてから削除してください。</>,
      },
    ],
  },
  {
    title: "ポイント・点数",
    id: "points",
    items: [
      {
        q: "ポイントはいつ従業員が使えるようになりますか？",
        a: <>今月の報告でもらったポイントは「翌月反映予定」となり、翌月 1 日に使えるポイントに加わります。</>,
      },
      {
        q: "従業員にポイントを上乗せしたい（または減らしたい）です。",
        a: (
          <>
            ユーザー編集の「ポイント調整」で加算・減算できます。会社の保有ポイントとの間でポイントが移動します（<DocLink href="/docs/user-edit#points">手順</DocLink>）。
          </>
        ),
      },
      {
        q: "点数からポイントへの換算を変えたいです。",
        a: <>換算は、契約上の ID 料金（1 人あたりの月額）をもとに決まっています。変更は契約内容に関わるため、運用者にご相談ください。</>,
      },
      {
        q: "従業員が間違えて報告したので取り消したいです。",
        a: <>管理者の画面からは取り消せません。運用者にお問い合わせください（カテゴリ「データ確認」）。従業員名・日時・ミッション名を添えてください。</>,
      },
    ],
  },
  {
    title: "分析・レポート",
    id: "analysis",
    items: [
      {
        q: "個人分析で従業員が選べません（薄く表示されます）。",
        a: <>休止中または招待中の従業員は選べません。初回ログインが済んで「有効」になると選べるようになります。</>,
      },
      {
        q: "エクスポートした CSV を Excel で開くと文字化けします。",
        a: <>エクスポートのダイアログで「Excel (.xlsx)」を選んでください。CSV を使う場合は、Excel の「データの取り込み」から文字コード UTF-8 を指定して開いてください。</>,
      },
      {
        q: "「改善余地がある項目」の基準を変えたいです。",
        a: <>達成率の基準（標準では 80% 以上 / 40% 未満）は、運用者が会社ごと・ミッションごとに設定できます。運用者にご相談ください。</>,
      },
    ],
  },
  {
    title: "各種情報・請求",
    id: "info",
    items: [
      {
        q: "理念体系を保存したのに、従業員の画面に反映されません。",
        a: <>従業員がダッシュボードを開き直す（再読み込みする）と反映されます。「入力内容を確認してください」と表示されて保存できていない場合は、見出しと内容の両方が入っているか確認してください。</>,
      },
      {
        q: "会社名を変更したいです。",
        a: <>会社名は運用者が管理しています。運用者にお問い合わせください。ダッシュボードに表示する「表示名」は、会社情報のタブでご自身で変更できます。</>,
      },
      {
        q: "ミッションを追加・変更したいです。",
        a: <>ミッションの登録・変更は運用者が行います。運用者にご相談ください。月の途中の点数計算に影響しないよう、翌月 1 日からの反映が基本です。</>,
      },
      {
        q: "今月の請求書がダウンロードできません。",
        a: <>請求書は、月が終わって金額が確定した月から表示できます。今月分は翌月になってからご確認ください。</>,
      },
      {
        q: "請求書の宛先の住所・担当者名を直したいです。",
        a: (
          <>
            各種情報の「会社情報」タブで住所・担当者名を変更すると、請求書にも反映されます（<DocLink href="/docs/info#company">手順</DocLink>）。
          </>
        ),
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
            よくいただく質問と、その答えをまとめました。ここで解決しない場合は、<DocLink href="/docs/support">運用者への問い合わせ</DocLink> をご利用ください。
          </>
        }
      />

      <div className="mt-8 flex flex-wrap gap-2">
        {GROUPS.map((group) => (
          <a
            key={group.id}
            href={`#${group.id}`}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-800"
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
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-700 text-sm font-bold text-white">
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
